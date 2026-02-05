import { SwipeDirection, MatchType } from '@prisma/client';

interface SwipeData {
  userId: string;
  itemId: string;
  direction: SwipeDirection;
}

interface MatchResult {
  type: MatchType;
  winnerId: string | null;
  confidence: number;
  tiedItems?: string[];
  topItems?: Array<{ itemId: string; score: number }>;
  votes: Record<string, Record<string, SwipeDirection>>;
}

interface DecisionConfig {
  strongMatchThreshold: number;  // Default: 0.5 (majority)
  superLikeWeight: number;       // Default: 2.0 (counts as 2 votes)
  minVotesRequired: number;      // Minimum votes to make decision
}

class DecisionEngine {
  private config: DecisionConfig = {
    strongMatchThreshold: 0.5,
    superLikeWeight: 2.0,
    minVotesRequired: 1,
  };

  /**
   * Process all swipes and determine match result
   */
  calculateMatch(
    swipes: SwipeData[],
    memberCount: number,
    itemIds: string[]
  ): MatchResult {
    // Step 1: Aggregate votes per item
    const voteMap = this.aggregateVotes(swipes, itemIds);

    // Step 2: Calculate scores for each item
    const scores = this.calculateScores(voteMap, memberCount);

    // Step 3: Check for super like winner
    const superLikeWinner = this.checkSuperLikeWinner(voteMap, memberCount);
    if (superLikeWinner) {
      return {
        type: MatchType.SUPER,
        winnerId: superLikeWinner.itemId,
        confidence: superLikeWinner.confidence,
        votes: this.formatVotes(voteMap),
      };
    }

    // Step 4: Sort by score and determine match type
    const sortedItems = Object.entries(scores)
      .filter(([_, score]) => score.positiveVotes > 0)
      .sort((a, b) => b[1].weightedScore - a[1].weightedScore);

    if (sortedItems.length === 0) {
      return {
        type: MatchType.TIE, // Use TIE for no match scenario
        winnerId: null,
        confidence: 0,
        topItems: [],
        votes: this.formatVotes(voteMap),
      };
    }

    const [topItemId, topScore] = sortedItems[0];
    const topRatio = topScore.positiveVotes / memberCount;

    // Step 5: Check for strong match (majority)
    if (topRatio > this.config.strongMatchThreshold) {
      return {
        type: MatchType.STRONG,
        winnerId: topItemId,
        confidence: topRatio,
        votes: this.formatVotes(voteMap),
      };
    }

    // Step 6: Check for tie
    if (sortedItems.length > 1) {
      const [, secondScore] = sortedItems[1];
      if (topScore.weightedScore === secondScore.weightedScore) {
        const tiedItems = sortedItems
          .filter(([_, s]) => s.weightedScore === topScore.weightedScore)
          .map(([id]) => id);

        return {
          type: MatchType.TIE,
          winnerId: null,
          confidence: topRatio,
          tiedItems,
          votes: this.formatVotes(voteMap),
        };
      }
    }

    // Step 7: Weak match (plurality but not majority)
    return {
      type: MatchType.WEAK,
      winnerId: topItemId,
      confidence: topRatio,
      topItems: sortedItems.slice(0, 3).map(([id, score]) => ({
        itemId: id,
        score: score.weightedScore,
      })),
      votes: this.formatVotes(voteMap),
    };
  }

  /**
   * Aggregate swipes into vote map
   */
  private aggregateVotes(
    swipes: SwipeData[],
    itemIds: string[]
  ): Map<string, Map<string, SwipeDirection>> {
    const voteMap = new Map<string, Map<string, SwipeDirection>>();

    // Initialize all items
    for (const itemId of itemIds) {
      voteMap.set(itemId, new Map());
    }

    // Populate with swipes
    for (const swipe of swipes) {
      const itemVotes = voteMap.get(swipe.itemId);
      if (itemVotes) {
        itemVotes.set(swipe.userId, swipe.direction);
      }
    }

    return voteMap;
  }

  /**
   * Calculate weighted scores for each item
   */
  private calculateScores(
    voteMap: Map<string, Map<string, SwipeDirection>>,
    memberCount: number
  ): Record<string, { positiveVotes: number; weightedScore: number; superLikes: number }> {
    const scores: Record<string, { positiveVotes: number; weightedScore: number; superLikes: number }> = {};

    for (const [itemId, votes] of voteMap) {
      let positiveVotes = 0;
      let weightedScore = 0;
      let superLikes = 0;

      for (const [_, direction] of votes) {
        if (direction === SwipeDirection.RIGHT) {
          positiveVotes += 1;
          weightedScore += 1;
        } else if (direction === SwipeDirection.UP) {
          positiveVotes += 1;
          superLikes += 1;
          weightedScore += this.config.superLikeWeight;
        }
        // LEFT adds nothing
      }

      scores[itemId] = { positiveVotes, weightedScore, superLikes };
    }

    return scores;
  }

  /**
   * Check if super like creates instant winner
   * Rule: If everyone super-likes the same item, it wins instantly
   */
  private checkSuperLikeWinner(
    voteMap: Map<string, Map<string, SwipeDirection>>,
    memberCount: number
  ): { itemId: string; confidence: number } | null {
    for (const [itemId, votes] of voteMap) {
      let superLikeCount = 0;
      for (const [_, direction] of votes) {
        if (direction === SwipeDirection.UP) superLikeCount++;
      }

      // All members super-liked this item
      if (superLikeCount === memberCount && memberCount > 0) {
        return { itemId, confidence: 1.0 };
      }
    }

    return null;
  }

  /**
   * Break a tie using fair random selection
   */
  resolveTie(tiedItemIds: string[], sessionId: string): string {
    // Use session ID as seed for deterministic "randomness"
    // This ensures all clients see the same result
    const seed = this.hashString(sessionId);
    const index = seed % tiedItemIds.length;
    return tiedItemIds[index];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private formatVotes(
    voteMap: Map<string, Map<string, SwipeDirection>>
  ): Record<string, Record<string, SwipeDirection>> {
    const result: Record<string, Record<string, SwipeDirection>> = {};
    for (const [itemId, votes] of voteMap) {
      result[itemId] = Object.fromEntries(votes);
    }
    return result;
  }

  /**
   * Check if session can proceed to decision
   */
  canDecide(swipes: SwipeData[], memberCount: number, deckSize: number): boolean {
    // All members have swiped all cards
    const userSwipeCounts = new Map<string, number>();
    for (const swipe of swipes) {
      userSwipeCounts.set(
        swipe.userId,
        (userSwipeCounts.get(swipe.userId) || 0) + 1
      );
    }

    if (userSwipeCounts.size < memberCount) {
      return false;
    }

    for (const [_, count] of userSwipeCounts) {
      if (count < deckSize) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check for early match (strong match before all swipes complete)
   */
  checkEarlyMatch(
    swipes: SwipeData[],
    memberCount: number,
    itemId: string
  ): { isMatch: boolean; confidence: number } {
    const itemSwipes = swipes.filter(s => s.itemId === itemId);

    // Need all members to have swiped this item
    if (itemSwipes.length < memberCount) {
      return { isMatch: false, confidence: 0 };
    }

    const positiveVotes = itemSwipes.filter(
      s => s.direction === SwipeDirection.RIGHT || s.direction === SwipeDirection.UP
    ).length;

    const ratio = positiveVotes / memberCount;

    return {
      isMatch: ratio > this.config.strongMatchThreshold,
      confidence: ratio,
    };
  }
}

export const decisionEngine = new DecisionEngine();
