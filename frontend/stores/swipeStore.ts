'use client';

import { create } from 'zustand';
import type { SwipeDirection } from '@/types';
import { socketClient } from '@/lib/socket';

interface SwipeRecord {
  itemId: string;
  direction: SwipeDirection;
  timestamp: number;
  durationMs: number;
}

interface SwipeState {
  // Swipe history for current session
  swipeHistory: SwipeRecord[];

  // Super like
  superLikeUsed: boolean;

  // Pending swipes (offline queue)
  pendingSwipes: SwipeRecord[];

  // Current card view timing
  cardViewStart: number | null;

  // Actions
  recordSwipe: (sessionId: string, itemId: string, direction: SwipeDirection) => void;
  useSuperLike: () => void;
  startCardView: () => void;
  getCardViewDuration: () => number;
  flushPendingSwipes: (sessionId: string) => void;
  reset: () => void;
}

export const useSwipeStore = create<SwipeState>()((set, get) => ({
  swipeHistory: [],
  superLikeUsed: false,
  pendingSwipes: [],
  cardViewStart: null,

  recordSwipe: (sessionId, itemId, direction) => {
    const { cardViewStart, superLikeUsed, pendingSwipes } = get();
    const now = Date.now();
    const durationMs = cardViewStart ? now - cardViewStart : 0;

    // Check super like usage
    if (direction === 'UP' && superLikeUsed) {
      console.warn('Super like already used');
      return;
    }

    const swipeRecord: SwipeRecord = {
      itemId,
      direction,
      timestamp: now,
      durationMs,
    };

    // Add to history
    set((state) => ({
      swipeHistory: [...state.swipeHistory, swipeRecord],
      superLikeUsed: direction === 'UP' ? true : state.superLikeUsed,
      cardViewStart: null,
    }));

    // Send to server
    if (socketClient.isConnected()) {
      socketClient.submitSwipe({
        sessionId,
        itemId,
        direction,
        durationMs,
      });
    } else {
      // Queue for later
      set({ pendingSwipes: [...pendingSwipes, swipeRecord] });
    }
  },

  useSuperLike: () => set({ superLikeUsed: true }),

  startCardView: () => set({ cardViewStart: Date.now() }),

  getCardViewDuration: () => {
    const { cardViewStart } = get();
    if (!cardViewStart) return 0;
    return Date.now() - cardViewStart;
  },

  flushPendingSwipes: (sessionId) => {
    const { pendingSwipes } = get();
    if (pendingSwipes.length === 0) return;

    for (const swipe of pendingSwipes) {
      socketClient.submitSwipe({
        sessionId,
        itemId: swipe.itemId,
        direction: swipe.direction,
        durationMs: swipe.durationMs,
      });
    }

    set({ pendingSwipes: [] });
  },

  reset: () =>
    set({
      swipeHistory: [],
      superLikeUsed: false,
      pendingSwipes: [],
      cardViewStart: null,
    }),
}));
