'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  MapPin,
  Star,
  Phone,
  ExternalLink,
  Share2,
  RotateCcw,
  ChefHat,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/common';
import { useSessionStore } from '@/stores/sessionStore';
import { api } from '@/lib/api';
import { shareTargetPicker, isInClient, openWindow } from '@/lib/liff';
import type { Decision, MenuInfo, RestaurantInfo } from '@/types';

export default function ResultPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const { session, matchedMenu, reset: resetSession } = useSessionStore();

  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch result
  useEffect(() => {
    async function fetchResult() {
      try {
        const response = await api.getSessionResult(sessionId);
        if (response.success && response.data) {
          setDecision((response.data as any).decision);
        }
      } catch (error) {
        console.error('Failed to fetch result:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchResult();
  }, [sessionId]);

  const handleOpenMap = () => {
    const restaurant = decision?.restaurant;
    if (restaurant?.googleMapsUrl) {
      openWindow(restaurant.googleMapsUrl, true);
    }
  };

  const handleShare = async () => {
    const restaurant = decision?.restaurant;
    const menu = decision?.menu;

    if (!restaurant || !menu) return;

    const message = `We're going to ${restaurant.name} for ${menu.name}! 🎉\n\nAddress: ${restaurant.address}`;

    if (isInClient()) {
      await shareTargetPicker([{ type: 'text', text: message }]);
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: `Toast! Decision: ${restaurant.name}`,
          text: message,
          url: restaurant.googleMapsUrl,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  const handleRestart = () => {
    resetSession();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-6">
        <p className="text-gray-500 mb-4">No decision found</p>
        <Button onClick={handleRestart}>Go Home</Button>
      </div>
    );
  }

  const { menu, restaurant } = decision;

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
        >
          <Trophy className="w-12 h-12 mx-auto mb-3" />
        </motion.div>
        <h1 className="text-2xl font-bold mb-1">Decision Made!</h1>
        <p className="text-white/80">Here&apos;s where you&apos;re going</p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {/* Restaurant Card */}
        {restaurant && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl overflow-hidden shadow-sm"
          >
            <div
              className="h-48 bg-cover bg-center"
              style={{ backgroundImage: `url(${restaurant.imageUrl})` }}
            />
            <div className="p-5">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {restaurant.name}
              </h2>
              {restaurant.nameLocal && (
                <p className="text-gray-500 mb-3">{restaurant.nameLocal}</p>
              )}

              {/* Info */}
              <div className="flex flex-wrap gap-3 mb-4">
                {restaurant.rating && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{restaurant.rating}</span>
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  {'฿'.repeat(restaurant.priceLevel)}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {restaurant.distance < 1000
                      ? `${restaurant.distance}m`
                      : `${(restaurant.distance / 1000).toFixed(1)}km`}
                  </span>
                </div>
              </div>

              {/* Address */}
              <p className="text-sm text-gray-600 mb-4">{restaurant.address}</p>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleOpenMap}
                  className="flex-1"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Open in Maps
                </Button>
                {restaurant.phone && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(`tel:${restaurant.phone}`)}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Menu Card */}
        {menu && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <ChefHat className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-500">
                You&apos;re having
              </span>
            </div>
            <div className="flex gap-4">
              <img
                src={menu.imageUrl}
                alt={menu.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div>
                <h3 className="font-semibold text-gray-900">{menu.name}</h3>
                {menu.nameLocal && (
                  <p className="text-sm text-gray-500">{menu.nameLocal}</p>
                )}
                <p className="text-sm text-orange-600 mt-1 capitalize">
                  {menu.cuisineType}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Decision Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            How we decided
          </h3>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Method</span>
            <span className="font-medium text-gray-900 capitalize">
              {decision.method.toLowerCase().replace('_', ' ')}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Confidence</span>
            <span className="font-medium text-gray-900">
              {Math.round(decision.confidence * 100)}%
            </span>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t border-gray-100 space-y-3">
        <Button
          variant="outline"
          onClick={handleShare}
          className="w-full"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share with Group
        </Button>
        <Button
          variant="ghost"
          onClick={handleRestart}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Start New Session
        </Button>
      </div>
    </div>
  );
}
