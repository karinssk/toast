'use client';

import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SwipeCard } from './SwipeCard';
import { SwipeControls } from './SwipeControls';
import { SwipeProgress } from './SwipeProgress';
import type { CardInfo, SwipeDirection } from '@/types';
import { useSwipeStore } from '@/stores/swipeStore';

interface SwipeDeckProps {
  cards: CardInfo[];
  currentIndex: number;
  onSwipe: (itemId: string, direction: SwipeDirection) => void;
  onComplete: () => void;
  superLikeAvailable?: boolean;
  memberProgress?: Record<string, number>;
  totalCards?: number;
}

export function SwipeDeck({
  cards,
  currentIndex,
  onSwipe,
  onComplete,
  superLikeAvailable = true,
  memberProgress,
  totalCards,
}: SwipeDeckProps) {
  const { startCardView, superLikeUsed } = useSwipeStore();

  // Start timing when current card changes
  useEffect(() => {
    if (currentIndex < cards.length) {
      startCardView();
    }
  }, [currentIndex, cards.length, startCardView]);

  // Check if deck is complete
  useEffect(() => {
    if (currentIndex >= cards.length && cards.length > 0) {
      onComplete();
    }
  }, [currentIndex, cards.length, onComplete]);

  const handleSwipe = (direction: SwipeDirection) => {
    const currentCard = cards[currentIndex];
    if (currentCard) {
      onSwipe(currentCard.id, direction);
    }
  };

  // Show only top 3 cards for performance
  const visibleCards = cards.slice(currentIndex, currentIndex + 3);
  const currentCard = cards[currentIndex];

  if (cards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">No cards available</p>
      </div>
    );
  }

  if (currentIndex >= cards.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">All done!</p>
          <p className="text-gray-500">Waiting for others to finish...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <SwipeProgress
        current={currentIndex}
        total={totalCards || cards.length}
        memberProgress={memberProgress}
      />

      {/* Card Stack */}
      <div className="flex-1 relative mx-4 my-4">
        <AnimatePresence>
          {visibleCards.map((card, index) => (
            <SwipeCard
              key={card.id}
              card={card}
              onSwipe={handleSwipe}
              isTop={index === 0}
              disabled={index !== 0}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <SwipeControls
        onSwipe={handleSwipe}
        superLikeAvailable={superLikeAvailable && !superLikeUsed}
        disabled={!currentCard}
      />
    </div>
  );
}
