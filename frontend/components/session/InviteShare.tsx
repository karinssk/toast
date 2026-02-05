'use client';

import { useState } from 'react';
import { Copy, Share2, Check } from 'lucide-react';
import { Button } from '@/components/common';
import { shareTargetPicker, isInClient } from '@/lib/liff';

interface InviteShareProps {
  code: string;
  inviteUrl?: string;
}

export function InviteShare({ code, inviteUrl }: InviteShareProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    if (isInClient()) {
      // Use LINE share
      await shareTargetPicker([
        {
          type: 'text',
          text: `Join me on Toast! to decide what to eat! Use code: ${code}\n\n${inviteUrl || ''}`,
        },
      ]);
    } else if (navigator.share) {
      // Use Web Share API
      try {
        await navigator.share({
          title: 'Join me on Toast!',
          text: `Let's decide what to eat together! Use code: ${code}`,
          url: inviteUrl,
        });
      } catch (error) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback to copy URL
      if (inviteUrl) {
        await navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Code Display */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-2">Invite Code</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-4xl font-mono font-bold tracking-wider text-orange-500">
            {code}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Share Button */}
      <Button
        onClick={handleShare}
        variant="outline"
        className="w-full"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share Invite
      </Button>
    </div>
  );
}
