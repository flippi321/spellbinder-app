import { create } from 'zustand';

import { getRepos } from '@/data';
import type { Profile } from '@/types';
import { authErrorMessage } from '@/utils/auth';
import { messageOf } from '@/utils/errors';

export type SessionStatus = 'idle' | 'loading' | 'signedIn' | 'signedOut' | 'error';

interface SessionState {
  status: SessionStatus;
  user: Profile | null;
  /** Loading the session failed (status `error`). */
  error: string | null;
  /** A sign-in, sign-up or password-reset request is in flight. */
  pending: boolean;
  /** Why the last sign-in, sign-up or password-reset request failed. */
  authError: string | null;
  init(): Promise<void>;
  /** Each auth action resolves to true on success; on failure it sets `authError` and resolves to false. */
  signIn(email: string, password: string): Promise<boolean>;
  signUp(email: string, password: string, displayName: string): Promise<boolean>;
  requestPasswordReset(email: string): Promise<boolean>;
  resetPassword(email: string, code: string, newPassword: string): Promise<boolean>;
  clearAuthError(): void;
  signOut(): Promise<void>;
}

let unsubscribeAuth: (() => void) | null = null;

export const useSessionStore = create<SessionState>()((set, get) => {
  /** Run an auth request with the shared pending/error state. A returned profile signs the user in. */
  const attempt = async (request: () => Promise<Profile | null | void>): Promise<boolean> => {
    set({ pending: true, authError: null });
    try {
      const user = await request();
      if (user) set({ user, status: 'signedIn', error: null });
      else if (user === null) throw new Error('Signed in, but your profile could not be loaded. Try again.');
      return true;
    } catch (error) {
      set({ authError: authErrorMessage(error) });
      return false;
    } finally {
      set({ pending: false });
    }
  };

  return {
    status: 'idle',
    user: null,
    error: null,
    pending: false,
    authError: null,

    async init() {
      set({ status: 'loading', error: null });
      const session = getRepos().session;
      // Token refresh failing, a sign-out on another device or an expired session all end up here.
      unsubscribeAuth?.();
      unsubscribeAuth = session.onAuthChange((userId) => {
        if (userId === null && get().status === 'signedIn') set({ user: null, status: 'signedOut' });
      });
      try {
        const user = await session.currentUser();
        set({ user, status: user ? 'signedIn' : 'signedOut' });
      } catch (error) {
        set({ status: 'error', error: messageOf(error) });
      }
    },

    signIn: (email, password) => attempt(() => getRepos().session.signIn(email.trim(), password)),

    signUp: (email, password, displayName) =>
      attempt(() => getRepos().session.signUp(email.trim(), password, displayName.trim())),

    requestPasswordReset: (email) => attempt(() => getRepos().session.requestPasswordReset(email.trim())),

    resetPassword: (email, code, newPassword) =>
      attempt(() => getRepos().session.resetPassword(email.trim(), code.trim(), newPassword)),

    clearAuthError: () => set({ authError: null }),

    async signOut() {
      await getRepos().session.signOut();
      set({ user: null, status: 'signedOut', authError: null });
    },
  };
});

/** The signed-in user's id (always set in mock mode). */
export const selectUserId = (state: SessionState) => state.user?.id ?? null;

/** False once that user has signed out or someone else signed in (drop answers to their requests). */
export const isSignedInAs = (userId: string) => useSessionStore.getState().user?.id === userId;
