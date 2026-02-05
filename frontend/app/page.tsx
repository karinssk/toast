'use client';

import { useRouter } from 'next/navigation';
import { Users, User, Utensils, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { isLoggedIn, login as liffLogin } from '@/lib/liff';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const handleSoloMode = () => {
    if (!isAuthenticated) {
      if (!isLoggedIn()) {
        liffLogin();
        return;
      }
    }
    router.push('/session/create?mode=solo');
  };

  const handleGroupMode = () => {
    if (!isAuthenticated) {
      if (!isLoggedIn()) {
        liffLogin();
        return;
      }
    }
    router.push('/session/create?mode=group');
  };

  const handleJoinSession = () => {
    if (!isAuthenticated) {
      if (!isLoggedIn()) {
        liffLogin();
        return;
      }
    }
    router.push('/session/join');
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 text-white px-6 py-12 flex flex-col items-center justify-center">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Utensils className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-bold mb-3">Toast!</h1>
          <p className="text-lg text-white/90">
            Decide where to eat, together
          </p>
        </div>

        {/* Mode Selection */}
        <div className="w-full max-w-sm space-y-4">
          {/* Solo Mode */}
          <button
            onClick={handleSoloMode}
            className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl p-5 text-left transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Solo Mode</h3>
                <p className="text-sm text-white/80">
                  Can&apos;t decide? Let us help you choose
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-white/60" />
            </div>
          </button>

          {/* Group Mode */}
          <button
            onClick={handleGroupMode}
            className="w-full bg-white rounded-2xl p-5 text-left transition-all hover:shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">Group Mode</h3>
                <p className="text-sm text-gray-600">
                  Swipe together with friends
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        </div>

        {/* Join Session Link */}
        <button
          onClick={handleJoinSession}
          className="mt-8 text-white/80 hover:text-white underline text-sm"
        >
          Have an invite code? Join a session
        </button>
      </div>

      {/* User Info Footer */}
      {isAuthenticated && user && (
        <div className="bg-white border-t border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            {user.pictureUrl ? (
              <img
                src={user.pictureUrl}
                alt={user.displayName}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{user.displayName}</p>
              <p className="text-sm text-gray-500">Logged in via LINE</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
