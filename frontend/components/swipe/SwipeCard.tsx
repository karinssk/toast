'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Heart, X, Star, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CardInfo, SwipeDirection } from '@/types';

interface SwipeCardProps {
  card: CardInfo;
  onSwipe: (direction: SwipeDirection) => void;
  isTop: boolean;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 100;
const ROTATION_RANGE = 30;

export function SwipeCard({ card, onSwipe, isTop, disabled }: SwipeCardProps) {
  const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Rotation based on x position
  const rotate = useTransform(x, [-200, 200], [-ROTATION_RANGE, ROTATION_RANGE]);

  // Opacity for indicators
  const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const nopeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const superLikeOpacity = useTransform(y, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;

    // Check for super like (swipe up)
    if (offset.y < -SWIPE_THRESHOLD || velocity.y < -500) {
      setExitDirection('UP');
      onSwipe('UP');
      return;
    }

    // Check for like (swipe right)
    if (offset.x > SWIPE_THRESHOLD || velocity.x > 500) {
      setExitDirection('RIGHT');
      onSwipe('RIGHT');
      return;
    }

    // Check for nope (swipe left)
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -500) {
      setExitDirection('LEFT');
      onSwipe('LEFT');
      return;
    }
  };

  const exitAnimation = {
    LEFT: { x: -500, rotate: -30, opacity: 0 },
    RIGHT: { x: 500, rotate: 30, opacity: 0 },
    UP: { y: -500, opacity: 0 },
  };

  return (
    <motion.div
      className={cn(
        'absolute w-full h-full rounded-2xl overflow-hidden shadow-xl cursor-grab active:cursor-grabbing',
        !isTop && 'pointer-events-none'
      )}
      style={{
        x,
        y,
        rotate,
        zIndex: isTop ? 10 : 1,
      }}
      drag={isTop && !disabled}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      animate={exitDirection ? exitAnimation[exitDirection] : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Card Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${card.imageUrl})` }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Swipe Indicators */}
      <motion.div
        className="absolute top-8 right-8 px-4 py-2 border-4 border-green-500 rounded-lg transform rotate-12"
        style={{ opacity: likeOpacity }}
      >
        <span className="text-2xl font-bold text-green-500">LIKE</span>
      </motion.div>

      <motion.div
        className="absolute top-8 left-8 px-4 py-2 border-4 border-red-500 rounded-lg transform -rotate-12"
        style={{ opacity: nopeOpacity }}
      >
        <span className="text-2xl font-bold text-red-500">NOPE</span>
      </motion.div>

      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 px-4 py-2 border-4 border-blue-500 rounded-lg"
        style={{ opacity: superLikeOpacity }}
      >
        <span className="text-2xl font-bold text-blue-500">SUPER LIKE</span>
      </motion.div>

      {/* Card Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <h2 className="text-2xl font-bold mb-1">{card.name}</h2>
        {card.nameLocal && (
          <p className="text-lg text-white/80 mb-2">{card.nameLocal}</p>
        )}

        {/* Menu-specific info */}
        {card.type === 'menu' && (
          <div className="flex flex-wrap gap-2 mb-3">
            {card.cuisineType && (
              <span className="px-2 py-1 bg-white/20 rounded-full text-sm capitalize">
                {card.cuisineType}
              </span>
            )}
            {card.priceRange && (
              <span className="px-2 py-1 bg-white/20 rounded-full text-sm">
                ฿{card.priceRange[0]} - ฿{card.priceRange[1]}
              </span>
            )}
            {card.tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-white/20 rounded-full text-sm capitalize"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Restaurant-specific info */}
        {card.type === 'restaurant' && (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm">
              {card.rating && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {card.rating.toFixed(1)}
                </span>
              )}
              {card.priceLevel && (
                <span>{'฿'.repeat(card.priceLevel)}</span>
              )}
              {card.distance && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {card.distance < 1000
                    ? `${card.distance}m`
                    : `${(card.distance / 1000).toFixed(1)}km`}
                </span>
              )}
            </div>
            {card.address && (
              <p className="text-sm text-white/70 line-clamp-1">{card.address}</p>
            )}
          </div>
        )}

        {card.description && (
          <p className="text-sm text-white/80 line-clamp-2 mt-2">
            {card.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}
