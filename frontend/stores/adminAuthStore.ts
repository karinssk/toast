'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Admin } from '@/types';
import { adminApi } from '@/lib/admin-api';

interface AdminAuthState {
  admin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setAdmin: (admin: Admin | null) => void;
  setToken: (token: string | null) => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setAdmin: (admin) => set({ admin, isAuthenticated: !!admin }),

      setToken: (token) => {
        set({ token });
        adminApi.setToken(token);
      },

      login: async (username, password) => {
        set({ isLoading: true, error: null });

        try {
          const response = await adminApi.login(username, password);

          if (!response.success || !response.data) {
            set({
              isLoading: false,
              error: response.error?.message || 'Login failed',
            });
            return false;
          }

          const { token, admin } = response.data as {
            token: string;
            admin: Admin;
          };

          adminApi.setToken(token);

          set({
            admin,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (error) {
          console.error('Admin login error:', error);
          set({
            isLoading: false,
            error: 'An unexpected error occurred',
          });
          return false;
        }
      },

      logout: () => {
        adminApi.setToken(null);

        set({
          admin: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) return false;

        adminApi.setToken(token);

        try {
          const response = await adminApi.getMe();

          if (!response.success || !response.data) {
            get().logout();
            return false;
          }

          const admin = (response.data as { admin: Admin }).admin;

          set({
            admin,
            isAuthenticated: true,
          });

          return true;
        } catch {
          get().logout();
          return false;
        }
      },
    }),
    {
      name: 'toast-admin-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
