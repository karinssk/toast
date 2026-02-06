'use client';

import { ReactNode, useEffect, useState, createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeLiff, isLoggedIn, getIdToken } from '@/lib/liff';
import { useAuthStore } from '@/stores/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

// LIFF Context
interface LiffContextType {
  isInitialized: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
}

const LiffContext = createContext<LiffContextType>({
  isInitialized: false,
  isLoggedIn: false,
  isLoading: true,
  error: null,
});

export const useLiff = () => useContext(LiffContext);

function LiffProvider({ children }: { children: ReactNode }) {
  const [liffState, setLiffState] = useState<LiffContextType>({
    isInitialized: false,
    isLoggedIn: false,
    isLoading: true,
    error: null,
  });

  const { login, checkAuth, token } = useAuthStore();

  useEffect(() => {
    async function initLiff() {
      try {
        await initializeLiff();

        const loggedIn = isLoggedIn();

        setLiffState({
          isInitialized: true,
          isLoggedIn: loggedIn,
          isLoading: false,
          error: null,
        });

        // If LIFF is logged in and we don't have a token, authenticate with backend
        if (loggedIn && !token) {
          const idToken = await getIdToken();
          if (idToken) {
            await login(idToken);
          }
        } else if (token) {
          // If we have a stored token, verify it's still valid
          await checkAuth();
        }
      } catch (error) {
        console.error('LIFF initialization error:', error);
        setLiffState({
          isInitialized: false,
          isLoggedIn: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize LIFF',
        });
      }
    }

    initLiff();
  }, []);

  return (
    <LiffContext.Provider value={liffState}>
      {children}
    </LiffContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LiffProvider>
        {children}
      </LiffProvider>
    </QueryClientProvider>
  );
}
