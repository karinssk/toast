'use client';

import { X, Heart, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { SwipeDirection } from '@/types';

interface SwipeControlsProps {
  onSwipe: (direction: SwipeDirection) => void;
  superLikeAvailable?: boolean;
  disabled?: boolean;
}

export function SwipeControls({
  onSwipe,
  superLikeAvailable = true,
  disabled = false,
}: SwipeControlsProps) {
  return (
    <div className="flex justify-center items-center gap-6 pb-8 pt-4">
      {/* Nope Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onSwipe('LEFT')}
        disabled={disabled}
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center',
          'bg-white shadow-lg border-2 border-red-500',
          'hover:bg-red-50 active:bg-red-100',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <X className="w-8 h-8 text-red-500" />
      </motion.button>

      {/* Super Like Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onSwipe('UP')}
        disabled={disabled || !superLikeAvailable}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center',
          'bg-white shadow-lg border-2 border-blue-500',
          'hover:bg-blue-50 active:bg-blue-100',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          !superLikeAvailable && 'border-gray-300'
        )}
      >
        <Star
          className={cn(
            'w-6 h-6',
            superLikeAvailable ? 'text-blue-500' : 'text-gray-400'
          )}
        />
      </motion.button>

      {/* Like Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onSwipe('RIGHT')}
        disabled={disabled}
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center',
          'bg-white shadow-lg border-2 border-green-500',
          'hover:bg-green-50 active:bg-green-100',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <Heart className="w-8 h-8 text-green-500" />
      </motion.button>
    </div>
  );
}
