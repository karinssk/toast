'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChefHat, ArrowRight } from 'lucide-react';
import { Button } from '@/components/common';
import { useSessionStore } from '@/stores/sessionStore';
import { useSwipeStore } from '@/stores/swipeStore';
import { api } from '@/lib/api';
import type { CardInfo } from '@/types';

export default function MenuResultPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [continuing, setContinuing] = useState(false);

  const { matchedMenu, pendingRestaurantDeck, setDeck, setPhase } = useSessionStore();
  const { reset: resetSwipe } = useSwipeStore();

  const handleContinue = async () => {
    setContinuing(true);
    resetSwipe();

    // Call API to transition phase (ensures DB is updated before swiping)
    const response = await api.continueSession(sessionId);

    if (response.success && response.data) {
      const { deck } = response.data;
      if (deck && deck.length > 0) {
        setDeck(deck as CardInfo[]);
      } else if (pendingRestaurantDeck.length > 0) {
        setDeck(pendingRestaurantDeck);
      }
      setPhase('RESTAURANT_SWIPE');
      router.push(`/session/${sessionId}/swipe`);
    } else {
      // Fallback: use pending deck if API fails
      if (pendingRestaurantDeck.length > 0) {
        setDeck(pendingRestaurantDeck);
      }
      setPhase('RESTAURANT_SWIPE');
      router.push(`/session/${sessionId}/swipe`);
    }
  };

  if (!matchedMenu) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-orange-400 via-orange-500 to-red-500">
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-white">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="mb-8"
        >
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
            <ChefHat className="w-10 h-10" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-bold mb-2">It&apos;s a Match!</h1>
          <p className="text-white/80">Everyone agreed on this dish</p>
        </motion.div>

        {/* Menu Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl"
        >
          <div
            className="h-48 bg-cover bg-center"
            style={{ backgroundImage: `url(${matchedMenu.imageUrl})` }}
          />
          <div className="p-5">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {matchedMenu.name}
            </h2>
            {matchedMenu.nameLocal && (
              <p className="text-gray-500 mb-3">{matchedMenu.nameLocal}</p>
            )}
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm capitalize">
                {matchedMenu.cuisineType}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                ฿{matchedMenu.priceRange[0]} - ฿{matchedMenu.priceRange[1]}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Next Step */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-white/80 text-center"
        >
          Now let&apos;s find the perfect restaurant!
        </motion.p>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="p-4"
      >
        <Button
          onClick={handleContinue}
          isLoading={continuing}
          className="w-full bg-white text-orange-600 hover:bg-gray-100"
          size="lg"
        >
          Find Restaurants
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
