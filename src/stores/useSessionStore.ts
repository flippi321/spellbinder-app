import { create } from 'zustand';

import { getRepos } from '@/data';
import type { Profile } from '@/types';
import { messageOf } from '@/utils/errors';

export type SessionStatus = 'idle' | 'loading' | 'signedIn' | 'signedOut' | 'error';

interface SessionState {
  status: SessionStatus;
  user: Profile | null;
  error: string | null;
  init(): Promise<void>;
  /** Supabase mode: email a one-time code. (The sign-in screen is a next step.) */
  signInWithOtp(email: string): Promise<void>;
  verifyOtp(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
}

export const useSessionStore = create<SessionState>()((set) => ({
  status: 'idle',
  user: null,
  error: null,

  async init() {
    set({ status: 'loading', error: null });
    try {
      const user = await getRepos().session.currentUser();
      set({ user, status: user ? 'signedIn' : 'signedOut' });
    } catch (error) {
      set({ status: 'error', error: messageOf(error) });
    }
  },

  async signInWithOtp(email) {
    await getRepos().session.signInWithOtp(email);
  },

  async verifyOtp(email, code) {
    const user = await getRepos().session.verifyOtp(email, code);
    set({ user, status: user ? 'signedIn' : 'signedOut' });
  },

  async signOut() {
    await getRepos().session.signOut();
    set({ user: null, status: 'signedOut' });
  },
}));

/** The signed-in user's id (always set in mock mode). */
export const selectUserId = (state: SessionState) => state.user?.id ?? null;
