'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Copy, Share2, Users, Play, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/common';
import { MemberList } from '@/components/session';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthStore } from '@/stores/authStore';
import { socketClient } from '@/lib/socket';
import { shareTargetPicker, isInClient, getLiffId } from '@/lib/liff';

export default function WaitingRoomPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const { session, setSession, startSession, isLoading } = useSessionStore();
  const { user } = useAuthStore();

  const [copied, setCopied] = useState(false);

  const isOwner = session?.owner.userId === user?.id;
  const inviteCode = session?.code || '';
  const liffId = getLiffId();
  const inviteUrl = session?.inviteUrl || `https://liff.line.me/${liffId}?session=${inviteCode}`;

  // Connect to socket and listen for updates
  useEffect(() => {
    if (!sessionId) return;

    const socket = socketClient.connect();
    socketClient.joinRoom(sessionId);

    // Listen for room state
    socket.on('room:state', (data) => {
      setSession(data as any);
    });

    // Listen for member joined
    socket.on('member:joined', (data) => {
      if (session) {
        setSession({
          ...session,
          members: [...session.members, data.member],
        });
      }
    });

    // Listen for member left
    socket.on('member:left', (data) => {
      if (session) {
        setSession({
          ...session,
          members: session.members.filter((m) => m.userId !== data.userId),
        });
      }
    });

    // Listen for session start
    socket.on('room:started', (data) => {
      router.push(`/session/${sessionId}/swipe`);
    });

    return () => {
      socket.off('room:state');
      socket.off('member:joined');
      socket.off('member:left');
      socket.off('room:started');
    };
  }, [sessionId, session, setSession, router]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (isInClient()) {
      // Use LINE share
      await shareTargetPicker([
        {
          type: 'text',
          text: `Join my Toast! session to decide where to eat!\n\nCode: ${inviteCode}\n\n${inviteUrl}`,
        },
      ]);
    } else if (navigator.share) {
      // Use Web Share API
      try {
        await navigator.share({
          title: 'Join my Toast! session',
          text: `Join my session to decide where to eat! Code: ${inviteCode}`,
          url: inviteUrl,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback to copy
      handleCopyCode();
    }
  };

  const handleStart = async () => {
    const success = await startSession();
    if (success) {
      router.push(`/session/${sessionId}/swipe`);
    }
  };

  const handleLeave = () => {
    socketClient.leaveRoom(sessionId);
    router.push('/');
  };

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
        <button onClick={handleLeave} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold">Waiting Room</h1>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 py-8">
        {/* Invite Code */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-500 mb-2">Share this code with friends</p>
          <div className="flex items-center gap-3">
            <div className="text-4xl font-mono font-bold tracking-widest text-gray-900">
              {inviteCode}
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Share Button */}
        <Button
          variant="outline"
          onClick={handleShare}
          className="mb-8"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Invite
        </Button>

        {/* Members */}
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-500">
              {session.members.length} / {5} members
            </span>
          </div>
          <MemberList members={session.members} />
        </div>

        {/* Waiting indicator */}
        {!isOwner && (
          <div className="mt-8 text-center text-gray-500">
            <div className="animate-pulse mb-2">Waiting for host to start...</div>
          </div>
        )}
      </div>

      {/* Footer */}
      {isOwner && (
        <div className="p-4 border-t border-gray-100">
          <Button
            onClick={handleStart}
            isLoading={isLoading}
            disabled={session.members.length < 1}
            className="w-full"
            size="lg"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Session
          </Button>
          {session.members.length < 2 && (
            <p className="text-sm text-gray-500 text-center mt-2">
              You can start alone or wait for more friends
            </p>
          )}
        </div>
      )}
    </div>
  );
}
