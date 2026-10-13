import type { TestUser } from '@/config';
import { setRepos, type Repos, type SessionRepo } from '@/data';
import { isSignedInAs, selectUserId, useSessionStore } from '@/stores/useSessionStore';
import type { Profile } from '@/types';

const mockConfig: { testUser: TestUser | null } = { testUser: null };
// Lazy: jest.mock is hoisted above mockConfig's declaration.
jest.mock('@/config', () => ({
  get config() {
    return mockConfig;
  },
}));

const me: Profile = { id: 'me', displayName: 'You', initials: 'YO', avatarColor: 'gold' };

const authError = (code: string) => Object.assign(new Error(`raw ${code}`), { code });

let authListener: ((userId: string | null) => void) | null;
const unsubscribe = jest.fn();

const session = {
  currentUser: jest.fn<Promise<Profile | null>, []>(),
  signIn: jest.fn<Promise<Profile | null>, [string, string]>(),
  signUp: jest.fn<Promise<Profile | null>, [string, string, string]>(),
  requestPasswordReset: jest.fn<Promise<void>, [string]>(),
  resetPassword: jest.fn<Promise<Profile | null>, [string, string, string]>(),
  onAuthChange: jest.fn((listener: (userId: string | null) => void) => {
    authListener = listener;
    return unsubscribe;
  }),
  signOut: jest.fn<Promise<void>, []>(),
} satisfies SessionRepo;

beforeEach(() => {
  jest.clearAllMocks();
  authListener = null;
  mockConfig.testUser = null;
  setRepos({ session } as unknown as Repos);
  useSessionStore.setState({ status: 'idle', user: null, error: null, pending: false, authError: null });
});
afterAll(() => setRepos(null));

describe('init', () => {
  it('restores a stored session', async () => {
    session.currentUser.mockResolvedValueOnce(me);
    await useSessionStore.getState().init();
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedIn', user: me, error: null });
  });

  it('is signed out without a stored session', async () => {
    session.currentUser.mockResolvedValueOnce(null);
    await useSessionStore.getState().init();
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedOut', user: null });
    expect(session.signIn).not.toHaveBeenCalled();
  });

  it('reports a failure to load the session', async () => {
    session.currentUser.mockRejectedValueOnce(new Error('Supabase: offline'));
    await useSessionStore.getState().init();
    expect(useSessionStore.getState()).toMatchObject({ status: 'error', error: 'Supabase: offline' });
  });

  it('signs out when the session ends elsewhere (expired, revoked, other device)', async () => {
    session.currentUser.mockResolvedValueOnce(me);
    await useSessionStore.getState().init();
    authListener?.('me');
    expect(useSessionStore.getState().status).toBe('signedIn');
    authListener?.(null);
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedOut', user: null });
  });

  it('ignores a signed-out event while not signed in', async () => {
    session.currentUser.mockRejectedValueOnce(new Error('offline'));
    await useSessionStore.getState().init();
    authListener?.(null);
    expect(useSessionStore.getState().status).toBe('error');
  });

  it('replaces its auth subscription when it runs again', async () => {
    session.currentUser.mockResolvedValue(me);
    await useSessionStore.getState().init();
    await useSessionStore.getState().init();
    expect(session.onAuthChange).toHaveBeenCalledTimes(2);
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe('init with a test user in .env', () => {
  const tester: Profile = { id: 'tester', displayName: 'tester', initials: 'TE', avatarColor: 'gold' };

  beforeEach(() => {
    mockConfig.testUser = { email: 'tester@spellbinder.test', password: 'password1' };
  });

  it('keeps a stored session', async () => {
    session.currentUser.mockResolvedValueOnce(me);
    await useSessionStore.getState().init();
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedIn', user: me });
    expect(session.signIn).not.toHaveBeenCalled();
  });

  it('signs in as the test user without a stored session', async () => {
    session.currentUser.mockResolvedValueOnce(null);
    session.signIn.mockResolvedValueOnce(tester);
    await useSessionStore.getState().init();
    expect(session.signIn).toHaveBeenCalledWith('tester@spellbinder.test', 'password1');
    expect(session.signUp).not.toHaveBeenCalled();
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedIn', user: tester, pending: false, authError: null });
  });

  it('stays loading while it signs in, so the sign-in screen never flashes', async () => {
    session.currentUser.mockResolvedValueOnce(null);
    let finish: (user: Profile) => void = () => undefined;
    session.signIn.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const done = useSessionStore.getState().init();
    await Promise.resolve();
    expect(useSessionStore.getState().status).toBe('loading');
    finish(tester);
    await done;
    expect(useSessionStore.getState().status).toBe('signedIn');
  });

  it('creates the account the first time, named after the email', async () => {
    session.currentUser.mockResolvedValueOnce(null);
    session.signIn.mockRejectedValueOnce(authError('invalid_credentials'));
    session.signUp.mockResolvedValueOnce(tester);
    await useSessionStore.getState().init();
    expect(session.signUp).toHaveBeenCalledWith('tester@spellbinder.test', 'password1', 'tester');
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedIn', user: tester, authError: null });
  });

  it('keeps the display name within 40 characters', async () => {
    mockConfig.testUser = { email: `${'a'.repeat(50)}@spellbinder.test`, password: 'password1' };
    session.currentUser.mockResolvedValueOnce(null);
    session.signIn.mockRejectedValueOnce(authError('invalid_credentials'));
    session.signUp.mockResolvedValueOnce(tester);
    await useSessionStore.getState().init();
    expect(session.signUp.mock.calls[0][2]).toBe('a'.repeat(40));
  });

  it.each(['user_already_exists', 'email_exists'])(
    'shows the sign-in screen with a wrong-password message when the account exists (%s)',
    async (code) => {
      session.currentUser.mockResolvedValueOnce(null);
      session.signIn.mockRejectedValueOnce(authError('invalid_credentials'));
      session.signUp.mockRejectedValueOnce(authError(code));
      await useSessionStore.getState().init();
      expect(useSessionStore.getState()).toMatchObject({
        status: 'signedOut',
        user: null,
        pending: false,
        authError: 'The test user in .env couldn’t sign in. That email and password don’t match.',
      });
    },
  );

  it('shows the sign-in screen with the reason when the account cannot be created', async () => {
    session.currentUser.mockResolvedValueOnce(null);
    session.signIn.mockRejectedValueOnce(authError('invalid_credentials'));
    session.signUp.mockRejectedValueOnce(authError('weak_password'));
    await useSessionStore.getState().init();
    expect(useSessionStore.getState()).toMatchObject({
      status: 'signedOut',
      authError: 'The test user in .env couldn’t sign in. Choose a stronger password (at least 8 characters).',
    });
  });

  it('does not try to create the account when sign-in fails for another reason', async () => {
    session.currentUser.mockResolvedValueOnce(null);
    session.signIn.mockRejectedValueOnce(Object.assign(new Error('fetch failed'), { name: 'AuthRetryableFetchError' }));
    await useSessionStore.getState().init();
    expect(session.signUp).not.toHaveBeenCalled();
    expect(useSessionStore.getState()).toMatchObject({
      status: 'signedOut',
      authError: 'The test user in .env couldn’t sign in. Couldn’t reach Spellbinder. Check your connection and try again.',
    });
  });

  it('shows the sign-in screen when the profile is missing after signing in', async () => {
    session.currentUser.mockResolvedValueOnce(null);
    session.signIn.mockResolvedValueOnce(null);
    await useSessionStore.getState().init();
    expect(useSessionStore.getState()).toMatchObject({
      status: 'signedOut',
      authError: 'Signed in, but your profile could not be loaded. Try again.',
    });
  });

  it('reports a failure to load the session without trying the test user', async () => {
    session.currentUser.mockRejectedValueOnce(new Error('Supabase: offline'));
    await useSessionStore.getState().init();
    expect(session.signIn).not.toHaveBeenCalled();
    expect(useSessionStore.getState()).toMatchObject({ status: 'error', error: 'Supabase: offline' });
  });
});

describe('signIn', () => {
  it('signs in with trimmed email and the exact password', async () => {
    session.signIn.mockResolvedValueOnce(me);
    await expect(useSessionStore.getState().signIn('  you@spellbinder.test ', ' secret pw ')).resolves.toBe(true);
    expect(session.signIn).toHaveBeenCalledWith('you@spellbinder.test', ' secret pw ');
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedIn', user: me, pending: false, authError: null });
  });

  it('explains a wrong password and stays signed out', async () => {
    useSessionStore.setState({ status: 'signedOut' });
    session.signIn.mockRejectedValueOnce(authError('invalid_credentials'));
    await expect(useSessionStore.getState().signIn('you@spellbinder.test', 'wrong-pass')).resolves.toBe(false);
    expect(useSessionStore.getState()).toMatchObject({
      status: 'signedOut',
      user: null,
      pending: false,
      authError: 'That email and password don’t match.',
    });
  });

  it('fails when the profile is missing after signing in', async () => {
    useSessionStore.setState({ status: 'signedOut' });
    session.signIn.mockResolvedValueOnce(null);
    await expect(useSessionStore.getState().signIn('you@spellbinder.test', 'password1')).resolves.toBe(false);
    expect(useSessionStore.getState()).toMatchObject({
      status: 'signedOut',
      authError: 'Signed in, but your profile could not be loaded. Try again.',
    });
  });

  it('is pending while the request runs, and a later success clears the error', async () => {
    useSessionStore.setState({ authError: 'old failure' });
    let finish: (user: Profile) => void = () => undefined;
    session.signIn.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const result = useSessionStore.getState().signIn('you@spellbinder.test', 'password1');
    expect(useSessionStore.getState()).toMatchObject({ pending: true, authError: null });
    finish(me);
    await expect(result).resolves.toBe(true);
    expect(useSessionStore.getState().pending).toBe(false);
  });
});

describe('signUp', () => {
  it('creates the account with a trimmed display name and signs in', async () => {
    session.signUp.mockResolvedValueOnce(me);
    await expect(useSessionStore.getState().signUp(' new@spellbinder.test', 'password1', '  Jonas ')).resolves.toBe(true);
    expect(session.signUp).toHaveBeenCalledWith('new@spellbinder.test', 'password1', 'Jonas');
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedIn', user: me });
  });

  it('explains an email that is already registered', async () => {
    session.signUp.mockRejectedValueOnce(authError('user_already_exists'));
    await expect(useSessionStore.getState().signUp('you@spellbinder.test', 'password1', 'You')).resolves.toBe(false);
    expect(useSessionStore.getState().authError).toBe('There’s already an account with that email. Sign in instead.');
  });
});

describe('password reset', () => {
  it('requests a code without signing in', async () => {
    session.requestPasswordReset.mockResolvedValueOnce(undefined);
    await expect(useSessionStore.getState().requestPasswordReset(' you@spellbinder.test ')).resolves.toBe(true);
    expect(session.requestPasswordReset).toHaveBeenCalledWith('you@spellbinder.test');
    expect(useSessionStore.getState()).toMatchObject({ status: 'idle', user: null, authError: null });
  });

  it('explains a rate-limited request', async () => {
    session.requestPasswordReset.mockRejectedValueOnce(authError('over_email_send_rate_limit'));
    await expect(useSessionStore.getState().requestPasswordReset('you@spellbinder.test')).resolves.toBe(false);
    expect(useSessionStore.getState().authError).toBe('Too many emails sent. Wait a few minutes and try again.');
  });

  it('sets the new password with a trimmed code and signs in', async () => {
    session.resetPassword.mockResolvedValueOnce(me);
    await expect(
      useSessionStore.getState().resetPassword('you@spellbinder.test', ' 123456 ', 'new-password'),
    ).resolves.toBe(true);
    expect(session.resetPassword).toHaveBeenCalledWith('you@spellbinder.test', '123456', 'new-password');
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedIn', user: me });
  });

  it('explains a wrong or expired code', async () => {
    session.resetPassword.mockRejectedValueOnce(authError('otp_expired'));
    await expect(
      useSessionStore.getState().resetPassword('you@spellbinder.test', '000000', 'new-password'),
    ).resolves.toBe(false);
    expect(useSessionStore.getState().authError).toBe('That code is wrong or has expired. Ask for a new one.');
  });
});

describe('clearAuthError', () => {
  it('clears the last failure', () => {
    useSessionStore.setState({ authError: 'That email and password don’t match.' });
    useSessionStore.getState().clearAuthError();
    expect(useSessionStore.getState().authError).toBeNull();
  });
});

describe('selectUserId', () => {
  it('is the signed-in user id, or null when signed out', () => {
    useSessionStore.setState({ user: me });
    expect(selectUserId(useSessionStore.getState())).toBe('me');
    useSessionStore.setState({ user: null });
    expect(selectUserId(useSessionStore.getState())).toBeNull();
  });
});

describe('isSignedInAs', () => {
  it('is true only for the signed-in user', () => {
    useSessionStore.setState({ user: me });
    expect(isSignedInAs('me')).toBe(true);
    expect(isSignedInAs('someone-else')).toBe(false);
    useSessionStore.setState({ user: null });
    expect(isSignedInAs('me')).toBe(false);
  });
});

describe('signOut', () => {
  it('signs out and forgets the user', async () => {
    useSessionStore.setState({ status: 'signedIn', user: me, authError: 'stale' });
    session.signOut.mockResolvedValueOnce(undefined);
    await useSessionStore.getState().signOut();
    expect(session.signOut).toHaveBeenCalled();
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedOut', user: null, authError: null });
  });
});
