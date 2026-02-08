import { Server } from 'socket.io';
import { prisma } from '../../lib/prisma.js';
import { redis, RedisKeys } from '../../lib/redis.js';
import { decisionEngine } from '../../engine/decision-engine.js';
import { SwipeDirection, SessionPhase, SessionStatus, MemberStatus, MatchType } from '@prisma/client';

interface SwipeData {
  sessionId: string;
  itemId: string;
  direction: 'LEFT' | 'RIGHT' | 'UP';
  durationMs: number;
}

interface SwipeResult {
  totalCards: number;
  memberProgress: Record<string, number>;
  shouldCheckMatch: boolean;
}

export async function handleSwipe(
  userId: string,
  data: SwipeData
): Promise<SwipeResult> {
  const { sessionId, itemId, direction, durationMs } = data;

  console.log(`[SWIPE] handleSwipe called: userId=${userId}, sessionId=${sessionId}, itemId=${itemId}, direction=${direction}`);

  // Get session and member info
  const member = await prisma.sessionMember.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
    include: {
      session: true,
    },
  });

  if (!member || member.session.status !== SessionStatus.ACTIVE) {
    console.log(`[SWIPE] Invalid session or member: member=${!!member}, sessionStatus=${member?.session.status}`);
    throw new Error('Invalid session or member');
  }

  const phase = member.session.phase;
  console.log(`[SWIPE] Session phase from DB: ${phase}, sessionStatus: ${member.session.status}`);

  // Record swipe in database
  await prisma.swipe.create({
    data: {
      sessionId,
      userId,
      menuId: phase === SessionPhase.MENU_SWIPE ? itemId : null,
      restaurantId: phase === SessionPhase.RESTAURANT_SWIPE ? itemId : null,
      direction: direction as SwipeDirection,
      phase,
      swipeDurationMs: durationMs,
    },
  });

  // Update member progress
  const progressField = phase === SessionPhase.MENU_SWIPE ? 'menuSwipeIndex' : 'restSwipeIndex';
  await prisma.sessionMember.update({
    where: { id: member.id },
    data: {
      [progressField]: { increment: 1 },
      lastActiveAt: new Date(),
      // Track super like usage
      ...(direction === 'UP' ? { superLikeUsed: true } : {}),
    },
  });

  // Record swipe in Redis for real-time matching
  const swipeKey = RedisKeys.roomSwipes(sessionId, phase);
  await redis.zadd(
    swipeKey,
    Date.now(),
    JSON.stringify({
      userId,
      itemId,
      direction,
      timestamp: Date.now(),
    })
  );

  // Get deck to calculate progress
  const deckKey = RedisKeys.roomDeck(sessionId, phase === SessionPhase.MENU_SWIPE ? 'menu_swipe' : 'restaurant_swipe');
  console.log(`[SWIPE] Deck Redis key: ${deckKey}`);
  const deckData = await redis.get(deckKey);
  const deck = deckData ? JSON.parse(deckData) : [];
  const totalCards = deck.length;
  console.log(`[SWIPE] Deck found: ${!!deckData}, totalCards: ${totalCards}, deckItemIds: ${deck.map((c: { id: string }) => c.id).join(', ')}`);

  // Get all members' progress
  const members = await prisma.sessionMember.findMany({
    where: {
      sessionId,
      status: MemberStatus.ACTIVE,
    },
    select: {
      userId: true,
      menuSwipeIndex: true,
      restSwipeIndex: true,
    },
  });

  const memberProgress: Record<string, number> = {};
  let allComplete = true;

  for (const m of members) {
    const progress = phase === SessionPhase.MENU_SWIPE ? m.menuSwipeIndex : m.restSwipeIndex;
    memberProgress[m.userId] = progress;
    console.log(`[SWIPE] Member ${m.userId}: menuSwipeIndex=${m.menuSwipeIndex}, restSwipeIndex=${m.restSwipeIndex}, progress=${progress}, totalCards=${totalCards}`);
    if (progress < totalCards) {
      allComplete = false;
    }
  }

  console.log(`[SWIPE] allComplete: ${allComplete}, shouldCheckMatch: ${allComplete}`);

  return {
    totalCards,
    memberProgress,
    shouldCheckMatch: allComplete,
  };
}

export async function checkForMatch(
  sessionId: string,
  io: Server
): Promise<boolean> {
  console.log(`[MATCH] checkForMatch called for session: ${sessionId}`);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      members: {
        where: { status: MemberStatus.ACTIVE },
      },
    },
  });

  if (!session) {
    console.log(`[MATCH] Session not found: ${sessionId}`);
    return false;
  }

  const phase = session.phase;
  const memberCount = session.members.length;
  console.log(`[MATCH] Session phase: ${phase}, status: ${session.status}, memberCount: ${memberCount}`);

  // Get all swipes for this phase
  const swipes = await prisma.swipe.findMany({
    where: {
      sessionId,
      phase,
    },
  });
  console.log(`[MATCH] Swipes found for phase ${phase}: ${swipes.length}`);
  swipes.forEach((s, i) => {
    console.log(`[MATCH]   Swipe[${i}]: userId=${s.userId}, menuId=${s.menuId}, restaurantId=${s.restaurantId}, direction=${s.direction}, phase=${s.phase}`);
  });

  // Get deck items
  const deckKey = RedisKeys.roomDeck(sessionId, phase === SessionPhase.MENU_SWIPE ? 'menu_swipe' : 'restaurant_swipe');
  console.log(`[MATCH] Deck Redis key: ${deckKey}`);
  const deckData = await redis.get(deckKey);
  const deck = deckData ? JSON.parse(deckData) : [];
  const itemIds = deck.map((card: { id: string }) => card.id);
  console.log(`[MATCH] Deck found: ${!!deckData}, itemIds count: ${itemIds.length}, itemIds: ${itemIds.join(', ')}`);

  // Convert swipes to engine format
  const swipeData = swipes.map((s) => ({
    userId: s.userId,
    itemId: s.menuId || s.restaurantId || '',
    direction: s.direction,
  }));
  console.log(`[MATCH] SwipeData for engine:`, JSON.stringify(swipeData));

  // Calculate match
  const matchResult = decisionEngine.calculateMatch(swipeData, memberCount, itemIds);
  console.log(`[MATCH] Match result: type=${matchResult.type}, winnerId=${matchResult.winnerId}, confidence=${matchResult.confidence}, tiedItems=${JSON.stringify(matchResult.tiedItems)}, topItems=${JSON.stringify(matchResult.topItems)}`);

  if (!matchResult.winnerId && (!matchResult.tiedItems || matchResult.tiedItems.length === 0)) {
    // No match found
    console.log(`[MATCH] No match found - emitting match:none`);
    io.to(`session:${sessionId}`).emit('match:none', {
      sessionId,
      phase,
      topItems: matchResult.topItems || [],
    });
    return false;
  }

  if (matchResult.type === MatchType.TIE && matchResult.tiedItems?.length) {
    // Resolve tie
    const winnerId = decisionEngine.resolveTie(matchResult.tiedItems, sessionId);
    console.log(`[MATCH] Tie resolved: winnerId=${winnerId}`);
    matchResult.winnerId = winnerId;
  }

  // Record match in database
  await prisma.match.create({
    data: {
      sessionId,
      menuId: phase === SessionPhase.MENU_SWIPE ? matchResult.winnerId : null,
      matchType: matchResult.type,
      confidence: matchResult.confidence,
      voteCount: Object.values(matchResult.votes[matchResult.winnerId!] || {}).filter(
        (d) => d === 'RIGHT' || d === 'UP'
      ).length,
      totalVoters: memberCount,
      hasSuperLike: Object.values(matchResult.votes[matchResult.winnerId!] || {}).some(
        (d) => d === 'UP'
      ),
      phase,
    },
  });

  // Emit match found event
  console.log(`[MATCH] Emitting match:found: winnerId=${matchResult.winnerId}, type=${matchResult.type}`);
  io.to(`session:${sessionId}`).emit('match:found', {
    sessionId,
    phase,
    itemId: matchResult.winnerId,
    matchType: matchResult.type,
    confidence: matchResult.confidence,
    votes: matchResult.votes[matchResult.winnerId!] || {},
  });

  // Transition to next phase
  console.log(`[MATCH] About to transition phase. Current phase: ${phase}`);
  if (phase === SessionPhase.MENU_SWIPE) {
    console.log(`[MATCH] Entering MENU_SWIPE branch -> transitioning to MENU_RESULT`);
    // Get restaurants for the matched menu
    const restaurants = await prisma.restaurantMenu.findMany({
      where: {
        menuId: matchResult.winnerId!,
        isAvailable: true,
        restaurant: { isActive: true },
      },
      include: { restaurant: true },
      take: 15,
    });

    const restaurantDeck = restaurants.map((rm) => ({
      id: rm.restaurant.id,
      type: 'restaurant' as const,
      name: rm.restaurant.name,
      nameLocal: rm.restaurant.nameLocal,
      imageUrl: rm.restaurant.imageUrl,
      description: rm.restaurant.description,
      rating: rm.restaurant.rating,
      priceLevel: rm.restaurant.priceLevel,
      address: rm.restaurant.address,
    }));

    // Store restaurant deck
    await redis.setex(
      RedisKeys.roomDeck(sessionId, 'restaurant_swipe'),
      86400,
      JSON.stringify(restaurantDeck)
    );

    // Update session phase
    await prisma.session.update({
      where: { id: sessionId },
      data: { phase: SessionPhase.MENU_RESULT },
    });

    // Get menu details
    const menu = await prisma.menu.findUnique({
      where: { id: matchResult.winnerId! },
    });

    io.to(`session:${sessionId}`).emit('phase:menu_result', {
      sessionId,
      menu: menu ? {
        id: menu.id,
        name: menu.name,
        nameLocal: menu.nameLocal,
        imageUrl: menu.imageUrl,
        cuisineType: menu.cuisineType,
        priceRange: [menu.priceRangeLow, menu.priceRangeHigh],
      } : null,
      matchType: matchResult.type,
      confidence: matchResult.confidence,
      restaurants: restaurantDeck,
    });
  } else if (phase === SessionPhase.RESTAURANT_SWIPE) {
    console.log(`[MATCH] Entering RESTAURANT_SWIPE branch -> transitioning to FINAL_RESULT`);
    // Final decision
    const menu = await prisma.menu.findFirst({
      where: {
        matches: {
          some: {
            sessionId,
            phase: SessionPhase.MENU_SWIPE,
          },
        },
      },
    });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: matchResult.winnerId! },
    });

    // Calculate time to decision
    const timeToDecisionMs = session.startedAt
      ? Date.now() - session.startedAt.getTime()
      : 0;

    // Create decision record
    await prisma.decision.create({
      data: {
        sessionId,
        menuId: menu?.id,
        restaurantId: matchResult.winnerId,
        decisionType: 'RESTAURANT',
        confidence: matchResult.confidence,
        method: matchResult.type === MatchType.STRONG ? 'MAJORITY' :
                matchResult.type === MatchType.SUPER ? 'SUPER_LIKE' :
                'TIEBREAKER',
        voteBreakdown: matchResult.votes,
        timeToDecisionMs,
      },
    });

    // Update session status
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        phase: SessionPhase.FINAL_RESULT,
        completedAt: new Date(),
      },
    });

    console.log(`[MATCH] Emitting phase:final_result for session ${sessionId}, menu=${menu?.name}, restaurant=${restaurant?.name}`);
    io.to(`session:${sessionId}`).emit('phase:final_result', {
      sessionId,
      menu: menu ? {
        id: menu.id,
        name: menu.name,
        nameLocal: menu.nameLocal,
        imageUrl: menu.imageUrl,
        cuisineType: menu.cuisineType,
      } : null,
      restaurant: restaurant ? {
        id: restaurant.id,
        name: restaurant.name,
        nameLocal: restaurant.nameLocal,
        imageUrl: restaurant.imageUrl,
        address: restaurant.address,
        rating: restaurant.rating,
        priceLevel: restaurant.priceLevel,
        googleMapsUrl: restaurant.googleMapsUrl,
      } : null,
      decision: {
        method: matchResult.type === MatchType.STRONG ? 'MAJORITY'
          : matchResult.type === MatchType.SUPER ? 'SUPER_LIKE'
          : 'TIEBREAKER',
        confidence: matchResult.confidence,
        timeToDecisionMs,
      },
    });
  }

  return true;
}
