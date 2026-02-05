'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { api } from '@/lib/api';
import { socketClient } from '@/lib/socket';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (idToken: string, liffId?: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setToken: (token) => {
        set({ token });
        api.setToken(token);
        socketClient.setToken(token);
      },

      login: async (idToken, liffId) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.loginWithLine(idToken, liffId);

          if (!response.success || !response.data) {
            set({
              isLoading: false,
              error: response.error?.message || 'Login failed',
            });
            return false;
          }

          const { accessToken, user } = response.data;

          // Set token in API client and socket
          api.setToken(accessToken);
          socketClient.setToken(accessToken);

          set({
            user: user as User,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (error) {
          console.error('Login error:', error);
          set({
            isLoading: false,
            error: 'An unexpected error occurred',
          });
          return false;
        }
      },

      logout: () => {
        api.setToken(null);
        socketClient.setToken(null);
        socketClient.disconnect();

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshToken: async () => {
        const { token } = get();
        if (!token) return false;

        try {
          const response = await api.refreshToken();

          if (!response.success || !response.data) {
            get().logout();
            return false;
          }

          const { accessToken } = response.data;
          api.setToken(accessToken);
          socketClient.setToken(accessToken);
          set({ token: accessToken });

          return true;
        } catch {
          get().logout();
          return false;
        }
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) return false;

        api.setToken(token);

        try {
          const response = await api.getMe();

          if (!response.success || !response.data) {
            get().logout();
            return false;
          }

          set({
            user: response.data as User,
            isAuthenticated: true,
          });

          socketClient.setToken(token);
          return true;
        } catch {
          get().logout();
          return false;
        }
      },
    }),
    {
      name: 'toast-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
