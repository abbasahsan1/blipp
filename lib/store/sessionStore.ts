import { create } from 'zustand';

import { MY_ACCOUNT } from '@/lib/mockData';
import type { Account } from '@/lib/types';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type SessionStatus = 'signed-in' | 'signed-out';

interface SessionState {
  status: SessionStatus;
  account: Account | null;
  isLoadingProfile: boolean;
  hasLoadedProfile: boolean;
  isSigningIn: boolean;
  loadProfile: () => Promise<void>;
  signOut: () => void;
  signIn: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'signed-in',
  account: null,
  isLoadingProfile: false,
  hasLoadedProfile: false,
  isSigningIn: false,

  loadProfile: async () => {
    if (get().isLoadingProfile) return;
    set({ isLoadingProfile: true });
    // Placeholder for a real profile request while there is no backend yet.
    await delay(750);
    set({ account: MY_ACCOUNT, isLoadingProfile: false, hasLoadedProfile: true });
  },

  signOut: () => {
    set({ status: 'signed-out', account: null, hasLoadedProfile: false });
  },

  signIn: async () => {
    set({ isSigningIn: true });
    await delay(900);
    set({
      status: 'signed-in',
      account: MY_ACCOUNT,
      hasLoadedProfile: true,
      isSigningIn: false,
    });
  },
}));
