import { create } from 'zustand';

import { config, type TestUser } from '@/config';
import { getRepos } from '@/data';
import type { Profile } from '@/types';
import { DISPLAY_NAME_MAX_LENGTH, authErrorCode, authErrorMessage } from '@/utils/auth';
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

/** Names `.env`: the developer expected to skip the sign-in screen this message shows on. */
const testUserError = (error: unknown) => new Error(`The test user in .env couldn’t sign in. ${authErrorMessage(error)}`);

/** Development shortcut: sign in as the `.env` test user, creating the account the first time. */
async function signInTestUser({ email, password }: TestUser): Promise<Profile | null> {
  const session = getRepos().session;
  try {
    return await session.signIn(email, password);
  } catch (signInError) {
    // Supabase answers an unknown email and a wrong password alike, so try creating the account.
    if (authErrorCode(signInError) !== 'invalid_credentials') throw testUserError(signInError);
    try {
      return await session.signUp(email, password, email.split('@')[0].slice(0, DISPLAY_NAME_MAX_LENGTH));
    } catch (signUpError) {
      // The account exists after all, so the password in .env is wrong.
      const exists = ['user_already_exists', 'email_exists'].includes(authErrorCode(signUpError) ?? '');
      throw testUserError(exists ? signInError : signUpError);
    }
  }
}

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
        // No stored session: sign in as the `.env` test user if there is one. Only at launch, so signing out
        // still reaches the sign-in screen. If it fails, that screen shows with the reason.
        const testUser = config.testUser;
        if (!user && testUser && (await attempt(() => signInTestUser(testUser)))) return;
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
