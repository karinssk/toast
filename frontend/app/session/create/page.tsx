'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/common';
import { useSessionStore } from '@/stores/sessionStore';
import type { SessionFilters } from '@/types';

const CUISINES = [
  { id: 'thai', label: 'Thai', emoji: '🇹🇭' },
  { id: 'japanese', label: 'Japanese', emoji: '🇯🇵' },
  { id: 'korean', label: 'Korean', emoji: '🇰🇷' },
  { id: 'chinese', label: 'Chinese', emoji: '🇨🇳' },
  { id: 'italian', label: 'Italian', emoji: '🇮🇹' },
  { id: 'american', label: 'American', emoji: '🇺🇸' },
  { id: 'indian', label: 'Indian', emoji: '🇮🇳' },
  { id: 'vietnamese', label: 'Vietnamese', emoji: '🇻🇳' },
];

export default function CreateSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'solo' | 'group') || 'group';

  const { createSession, isLoading } = useSessionStore();

  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([1, 4]);
  const [maxDistance, setMaxDistance] = useState(3000);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const toggleCuisine = (cuisineId: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisineId)
        ? prev.filter((c) => c !== cuisineId)
        : [...prev, cuisineId]
    );
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setGettingLocation(false);
        alert('Unable to get your location. Please enable location services.');
      }
    );
  };

  const handleCreate = async () => {
    const filters: SessionFilters = {
      cuisines: selectedCuisines,
      priceRange,
      maxDistance,
      location,
    };

    const session = await createSession(mode.toUpperCase() as 'SOLO' | 'GROUP', filters);

    if (session) {
      if (mode === 'solo') {
        router.push(`/session/${session.id}/swipe`);
      } else {
        router.push(`/session/${session.id}/waiting`);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold">
          {mode === 'solo' ? 'Solo Session' : 'Create Group Session'}
        </h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {/* Cuisine Selection */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            What are you in the mood for?
          </h2>
          <div className="flex flex-wrap gap-2">
            {CUISINES.map((cuisine) => (
              <button
                key={cuisine.id}
                onClick={() => toggleCuisine(cuisine.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCuisines.includes(cuisine.id)
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cuisine.emoji} {cuisine.label}
              </button>
            ))}
          </div>
          {selectedCuisines.length === 0 && (
            <p className="text-sm text-gray-400 mt-2">
              Leave empty to see all cuisines
            </p>
          )}
        </section>

        {/* Price Range */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Price Range
          </h2>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((level) => (
              <button
                key={level}
                onClick={() => {
                  if (level <= priceRange[0]) {
                    setPriceRange([level, priceRange[1]]);
                  } else if (level >= priceRange[1]) {
                    setPriceRange([priceRange[0], level]);
                  } else {
                    setPriceRange([level, level]);
                  }
                }}
                className={`flex-1 py-3 rounded-lg text-center font-medium transition-colors ${
                  level >= priceRange[0] && level <= priceRange[1]
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {'฿'.repeat(level)}
              </button>
            ))}
          </div>
        </section>

        {/* Distance */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Maximum Distance
          </h2>
          <div className="space-y-3">
            <input
              type="range"
              min="500"
              max="10000"
              step="500"
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>500m</span>
              <span className="font-medium text-orange-600">
                {maxDistance >= 1000
                  ? `${(maxDistance / 1000).toFixed(1)}km`
                  : `${maxDistance}m`}
              </span>
              <span>10km</span>
            </div>
          </div>
        </section>

        {/* Location */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Your Location
          </h2>
          {location ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg">
              <MapPin className="w-5 h-5" />
              <span className="text-sm">Location set</span>
              <button
                onClick={() => setLocation(null)}
                className="ml-auto text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={handleGetLocation}
              isLoading={gettingLocation}
              className="w-full"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Use My Location
            </Button>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <Button
          onClick={handleCreate}
          isLoading={isLoading}
          className="w-full"
          size="lg"
        >
          {mode === 'solo' ? 'Start Swiping' : 'Create Session'}
        </Button>
      </div>
    </div>
  );
}
