'use client';

import { Avatar } from '@/components/common';
import { cn } from '@/lib/utils';
import { Crown, Loader2 } from 'lucide-react';
import type { MemberInfo } from '@/types';

interface MemberListProps {
  members: MemberInfo[];
  showProgress?: boolean;
  totalCards?: number;
}

export function MemberList({ members, showProgress, totalCards }: MemberListProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {members.map((member) => (
        <MemberAvatar
          key={member.userId}
          member={member}
          showProgress={showProgress}
          totalCards={totalCards}
        />
      ))}
    </div>
  );
}

interface MemberAvatarProps {
  member: MemberInfo;
  showProgress?: boolean;
  totalCards?: number;
}

export function MemberAvatar({ member, showProgress, totalCards }: MemberAvatarProps) {
  const isComplete = totalCards ? member.progress >= totalCards : false;
  const progressPercent = totalCards ? (member.progress / totalCards) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <Avatar
          src={member.pictureUrl}
          alt={member.displayName}
          size="md"
          className={cn(
            'ring-2',
            member.status === 'ACTIVE' ? 'ring-green-500' : 'ring-gray-300',
            member.status === 'IDLE' && 'ring-yellow-500'
          )}
        />

        {/* Owner crown */}
        {member.isOwner && (
          <Crown className="absolute -top-2 -right-1 w-4 h-4 text-yellow-500 fill-yellow-500" />
        )}

        {/* Status indicator */}
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
            member.status === 'ACTIVE' && 'bg-green-500',
            member.status === 'IDLE' && 'bg-yellow-500',
            member.status === 'REMOVED' && 'bg-red-500',
            member.status === 'LEFT' && 'bg-gray-500'
          )}
        />

        {/* Progress ring */}
        {showProgress && totalCards && !isComplete && (
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 36 36"
          >
            <circle
              className="text-gray-200"
              strokeWidth="3"
              stroke="currentColor"
              fill="transparent"
              r="16"
              cx="18"
              cy="18"
            />
            <circle
              className="text-orange-500"
              strokeWidth="3"
              stroke="currentColor"
              fill="transparent"
              r="16"
              cx="18"
              cy="18"
              strokeDasharray={`${progressPercent}, 100`}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Loading indicator */}
        {showProgress && !isComplete && member.status === 'ACTIVE' && (
          <Loader2 className="absolute -bottom-1 -right-1 w-4 h-4 text-orange-500 animate-spin" />
        )}

        {/* Complete checkmark */}
        {showProgress && isComplete && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      <span className="text-xs text-gray-600 max-w-16 truncate">
        {member.displayName}
      </span>
    </div>
  );
}
