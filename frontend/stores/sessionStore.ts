'use client';

import { create } from 'zustand';
import type { Session, SessionFilters, MemberInfo, CardInfo, MenuInfo, RestaurantInfo, SessionPhase } from '@/types';
import { api } from '@/lib/api';
import { socketClient } from '@/lib/socket';

interface SessionState {
  session: Session | null;
  deck: CardInfo[];
  currentIndex: number;
  matchedMenu: MenuInfo | null;
  matchedRestaurant: RestaurantInfo | null;
  isLoading: boolean;
  error: string | null;

  // Progress
  memberProgress: Record<string, number>;
  totalCards: number;

  // Actions
  setSession: (session: Session | null) => void;
  setDeck: (deck: CardInfo[]) => void;
  setCurrentIndex: (index: number) => void;
  incrementIndex: () => void;
  setMatchedMenu: (menu: MenuInfo | null) => void;
  setMatchedRestaurant: (restaurant: RestaurantInfo | null) => void;
  updateMember: (userId: string, updates: Partial<MemberInfo>) => void;
  updateProgress: (progress: Record<string, number>, total: number) => void;
  setPhase: (phase: SessionPhase) => void;

  // API actions
  createSession: (mode: 'SOLO' | 'GROUP', filters: SessionFilters) => Promise<(Session & { deck?: CardInfo[] }) | null>;
  joinSession: (code: string) => Promise<Session | null>;
  startSession: (sessionIdOverride?: string) => Promise<boolean>;
  leaveSession: () => Promise<void>;

  // Reset
  reset: () => void;
}

const initialState = {
  session: null,
  deck: [],
  currentIndex: 0,
  matchedMenu: null,
  matchedRestaurant: null,
  isLoading: false,
  error: null,
  memberProgress: {},
  totalCards: 0,
};

export const useSessionStore = create<SessionState>()((set, get) => ({
  ...initialState,

  setSession: (session) => set({ session }),

  setDeck: (deck) => set({ deck, totalCards: deck.length, currentIndex: 0 }),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  incrementIndex: () => set((state) => ({ currentIndex: state.currentIndex + 1 })),

  setMatchedMenu: (menu) => set({ matchedMenu: menu }),

  setMatchedRestaurant: (restaurant) => set({ matchedRestaurant: restaurant }),

  updateMember: (userId, updates) =>
    set((state) => {
      if (!state.session) return state;

      const members = state.session.members.map((m) =>
        m.userId === userId ? { ...m, ...updates } : m
      );

      return {
        session: { ...state.session, members },
      };
    }),

  updateProgress: (progress, total) =>
    set({ memberProgress: progress, totalCards: total }),

  setPhase: (phase) =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: { ...state.session, phase },
        currentIndex: 0,
      };
    }),

  createSession: async (mode, filters) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.createSession(mode, filters);

      if (!response.success || !response.data) {
        set({
          isLoading: false,
          error: response.error?.message || 'Failed to create session',
        });
        return null;
      }

      const data = response.data as Session & { deck?: CardInfo[] };
      set({ session: data, isLoading: false });

      // Join socket room
      socketClient.joinRoom(data.id);

      return data;
    } catch (error) {
      console.error('Create session error:', error);
      set({
        isLoading: false,
        error: 'An unexpected error occurred',
      });
      return null;
    }
  },

  joinSession: async (code) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.joinSession(code);

      if (!response.success || !response.data) {
        set({
          isLoading: false,
          error: response.error?.message || 'Failed to join session',
        });
        return null;
      }

      const session = response.data.session as Session;
      set({ session, isLoading: false });

      // Join socket room
      socketClient.joinRoom(session.id);

      return session;
    } catch (error) {
      console.error('Join session error:', error);
      set({
        isLoading: false,
        error: 'An unexpected error occurred',
      });
      return null;
    }
  },

  startSession: async (sessionIdOverride?: string) => {
    const { session } = get();
    const sessionId = sessionIdOverride || session?.id;

    if (!sessionId) {
      set({ error: 'No session ID available' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await api.startSession(sessionId);

      if (!response.success || !response.data) {
        set({
          isLoading: false,
          error: response.error?.message || 'Failed to start session',
        });
        return false;
      }

      const { deck } = response.data;
      set((state) => ({
        session: state.session ? { ...state.session, status: 'ACTIVE' } : null,
        deck: deck as CardInfo[],
        totalCards: deck.length,
        currentIndex: 0,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('Start session error:', error);
      set({
        isLoading: false,
        error: 'An unexpected error occurred',
      });
      return false;
    }
  },

  leaveSession: async () => {
    const { session } = get();
    if (!session) return;

    try {
      await api.leaveSession(session.id);
      socketClient.leaveRoom(session.id);
    } finally {
      get().reset();
    }
  },

  reset: () => set(initialState),
}));
