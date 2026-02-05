'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SwipeDeck } from '@/components/swipe';
import { MemberList } from '@/components/session';
import { useSessionStore } from '@/stores/sessionStore';
import { useSwipeStore } from '@/stores/swipeStore';
import { socketClient } from '@/lib/socket';
import type { SwipeDirection, CardInfo, MenuInfo, RestaurantInfo } from '@/types';

export default function SwipePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const {
    session,
    deck,
    currentIndex,
    incrementIndex,
    setDeck,
    setMatchedMenu,
    setPhase,
    updateProgress,
    memberProgress,
    totalCards,
  } = useSessionStore();

  const { recordSwipe, reset: resetSwipe } = useSwipeStore();

  // Connect and listen for socket events
  useEffect(() => {
    if (!sessionId) return;

    const socket = socketClient.connect();
    socketClient.joinRoom(sessionId);

    // Listen for progress updates
    socket.on('swipe:progress', (data) => {
      updateProgress(data.memberProgress, data.totalCards);
    });

    // Listen for match found
    socket.on('match:found', (data) => {
      console.log('Match found:', data);
    });

    // Listen for menu result (transition to restaurant phase)
    socket.on('phase:menu_result', (data) => {
      setMatchedMenu(data.menu);
      router.push(`/session/${sessionId}/menu-result`);
    });

    // Listen for final result
    socket.on('phase:final_result', (data) => {
      router.push(`/session/${sessionId}/result`);
    });

    // Listen for room started (if joining mid-session)
    socket.on('room:started', (data) => {
      setDeck(data.deck as CardInfo[]);
    });

    return () => {
      socket.off('swipe:progress');
      socket.off('match:found');
      socket.off('phase:menu_result');
      socket.off('phase:final_result');
      socket.off('room:started');
    };
  }, [sessionId, router, setMatchedMenu, setDeck, updateProgress]);

  // Reset swipe store when component mounts
  useEffect(() => {
    resetSwipe();
  }, [resetSwipe]);

  const handleSwipe = useCallback(
    (itemId: string, direction: SwipeDirection) => {
      recordSwipe(sessionId, itemId, direction);
      incrementIndex();
    },
    [sessionId, recordSwipe, incrementIndex]
  );

  const handleComplete = useCallback(() => {
    // User finished swiping, waiting for others
    console.log('Swiping complete, waiting for others...');
  }, []);

  if (!session || deck.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-500">Loading cards...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header with members */}
      <header className="bg-white px-4 py-3 border-b border-gray-100">
        <MemberList
          members={session.members}
          showProgress
          totalCards={totalCards}
        />
      </header>

      {/* Swipe Deck */}
      <div className="flex-1 flex flex-col">
        <SwipeDeck
          cards={deck}
          currentIndex={currentIndex}
          onSwipe={handleSwipe}
          onComplete={handleComplete}
          superLikeAvailable={true}
          memberProgress={memberProgress}
          totalCards={totalCards}
        />
      </div>
    </div>
  );
}
