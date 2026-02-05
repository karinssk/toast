'use client';

import { cn } from '@/lib/utils';

interface SwipeProgressProps {
  current: number;
  total: number;
  memberProgress?: Record<string, number>;
}

export function SwipeProgress({
  current,
  total,
  memberProgress,
}: SwipeProgressProps) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  return (
    <div className="px-4 pt-4 space-y-2">
      {/* Main progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>
            {current} / {total}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Member progress (optional) */}
      {memberProgress && Object.keys(memberProgress).length > 1 && (
        <div className="flex gap-1">
          {Object.entries(memberProgress).map(([userId, progress]) => {
            const memberPercentage =
              total > 0 ? Math.min((progress / total) * 100, 100) : 0;
            return (
              <div
                key={userId}
                className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden"
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    memberPercentage === 100 ? 'bg-green-500' : 'bg-blue-400'
                  )}
                  style={{ width: `${memberPercentage}%` }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
