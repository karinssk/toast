'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/common';
import { useSessionStore } from '@/stores/sessionStore';
import { getSessionCodeFromUrl } from '@/lib/liff';

export default function JoinSessionPage() {
  const router = useRouter();
  const { joinSession, isLoading, error } = useSessionStore();

  const [code, setCode] = useState('');

  // Check for code in URL
  useEffect(() => {
    const urlCode = getSessionCodeFromUrl();
    if (urlCode) {
      setCode(urlCode.toUpperCase());
    }
  }, []);

  const handleCodeChange = (value: string) => {
    // Only allow alphanumeric characters, max 6
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(cleaned);
  };

  const handleJoin = async () => {
    if (code.length !== 6) return;

    const session = await joinSession(code);
    if (session) {
      router.push(`/session/${session.id}/waiting`);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold">Join Session</h1>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Enter Invite Code
            </h2>
            <p className="text-gray-500">
              Ask your friend for the 6-character code
            </p>
          </div>

          {/* Code Input */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className="w-12 h-14 border-2 border-gray-200 rounded-lg flex items-center justify-center text-2xl font-bold text-gray-900"
              >
                {code[index] || ''}
              </div>
            ))}
          </div>

          {/* Hidden input for keyboard */}
          <input
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="sr-only"
            autoFocus
            maxLength={6}
          />

          {/* Visible input as fallback */}
          <input
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="Enter code"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-xl font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            maxLength={6}
          />

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          {/* Join Button */}
          <Button
            onClick={handleJoin}
            isLoading={isLoading}
            disabled={code.length !== 6}
            className="w-full"
            size="lg"
          >
            Join Session
          </Button>
        </div>
      </div>
    </div>
  );
}
