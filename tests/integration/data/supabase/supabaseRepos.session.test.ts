import { createSupabaseRepos } from '@/data/supabase/supabaseRepos';

// SessionRepo only; the other Supabase repos get their own tests.

type Result = { data: unknown; error: { message: string } | null };

let mockClient: ReturnType<typeof makeClient>;
jest.mock('@/services/supabase', () => ({ getSupabase: () => mockClient }));
jest.mock('@/services/scryfall');

const profileRow = { id: 'me', display_name: 'You', initials: 'YO', avatar_color: 'gold' };
const profile = { id: 'me', displayName: 'You', initials: 'YO', avatarColor: 'gold' };
const signedIn = { data: { session: { user: { id: 'me' } } } };
const authError = (code: string) => ({ name: 'AuthApiError', message: `raw ${code}`, code });

function makeClient(profileResult: Result = { data: profileRow, error: null }) {
  const calls: [string, ...unknown[]][] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'maybeSingle']) {
    builder[method] = (...args: unknown[]) => (calls.push([method, ...args]), builder);
  }
  builder.then = (ok: (r: Result) => unknown, fail: (e: unknown) => unknown) =>
    Promise.resolve(profileResult).then(ok, fail);
  const unsubscribe = jest.fn();
  return {
    calls,
    unsubscribe,
    from: jest.fn((table: string) => (calls.push(['from', table]), builder)),
    auth: {
      getSession: jest.fn(async () => signedIn as { data: { session: { user: { id: string } } | null } }),
      signInWithPassword: jest.fn(async (_creds: unknown) => ({ error: null as unknown })),
      signUp: jest.fn(async (_creds: unknown) => ({ error: null as unknown })),
      resetPasswordForEmail: jest.fn(async (_email: string) => ({ error: null as unknown })),
      verifyOtp: jest.fn(async (_params: unknown) => ({ error: null as unknown })),
      updateUser: jest.fn(async (_attrs: unknown) => ({ error: null as unknown })),
      onAuthStateChange: jest.fn((_cb: (event: string, session: unknown) => void) => ({
        data: { subscription: { unsubscribe } },
      })),
      signOut: jest.fn(async () => ({ error: null })),
    },
  };
}

const session = () => createSupabaseRepos().session;

beforeEach(() => {
  mockClient = makeClient();
});

describe('currentUser', () => {
  it('loads the profile of the stored session', async () => {
    await expect(session().currentUser()).resolves.toEqual(profile);
    expect(mockClient.calls).toEqual([['from', 'profiles'], ['select', '*'], ['eq', 'id', 'me'], ['maybeSingle']]);
  });

  it('is null without a session', async () => {
    mockClient.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    await expect(session().currentUser()).resolves.toBeNull();
    expect(mockClient.from).not.toHaveBeenCalled();
  });

  it('is null when the profile row is missing', async () => {
    mockClient = makeClient({ data: null, error: null });
    await expect(session().currentUser()).resolves.toBeNull();
  });

  it('throws when the profile query fails', async () => {
    mockClient = makeClient({ data: null, error: { message: 'permission denied' } });
    await expect(session().currentUser()).rejects.toThrow('Supabase: permission denied');
  });
});

describe('signIn', () => {
  it('signs in with email + password and returns the profile', async () => {
    await expect(session().signIn('you@spellbinder.test', 'spellbinder-dev')).resolves.toEqual(profile);
    expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'you@spellbinder.test',
      password: 'spellbinder-dev',
    });
  });

  it('rethrows the auth error on wrong credentials', async () => {
    mockClient.auth.signInWithPassword.mockResolvedValueOnce({ error: authError('invalid_credentials') });
    await expect(session().signIn('you@spellbinder.test', 'wrong')).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
    expect(mockClient.from).not.toHaveBeenCalled();
  });
});

describe('signUp', () => {
  it('passes the display name as user metadata for the profile trigger', async () => {
    await expect(session().signUp('new@spellbinder.test', 'password1', 'Jonas')).resolves.toEqual(profile);
    expect(mockClient.auth.signUp).toHaveBeenCalledWith({
      email: 'new@spellbinder.test',
      password: 'password1',
      options: { data: { display_name: 'Jonas' } },
    });
  });

  it('rethrows the auth error when the email is taken', async () => {
    mockClient.auth.signUp.mockResolvedValueOnce({ error: authError('user_already_exists') });
    await expect(session().signUp('you@spellbinder.test', 'password1', 'You')).rejects.toMatchObject({
      code: 'user_already_exists',
    });
  });
});

describe('requestPasswordReset', () => {
  it('emails a reset code', async () => {
    await expect(session().requestPasswordReset('you@spellbinder.test')).resolves.toBeUndefined();
    expect(mockClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('you@spellbinder.test');
  });

  it('rethrows the auth error', async () => {
    mockClient.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: authError('over_email_send_rate_limit') });
    await expect(session().requestPasswordReset('you@spellbinder.test')).rejects.toMatchObject({
      code: 'over_email_send_rate_limit',
    });
  });
});

describe('resetPassword', () => {
  it('verifies the recovery code, sets the password and returns the profile', async () => {
    await expect(session().resetPassword('you@spellbinder.test', '123456', 'new-password')).resolves.toEqual(profile);
    expect(mockClient.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'you@spellbinder.test',
      token: '123456',
      type: 'recovery',
    });
    expect(mockClient.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' });
  });

  it('stops at a wrong or expired code', async () => {
    mockClient.auth.verifyOtp.mockResolvedValueOnce({ error: authError('otp_expired') });
    await expect(session().resetPassword('you@spellbinder.test', '000000', 'new-password')).rejects.toMatchObject({
      code: 'otp_expired',
    });
    expect(mockClient.auth.updateUser).not.toHaveBeenCalled();
  });

  it('rethrows when the new password is rejected', async () => {
    mockClient.auth.updateUser.mockResolvedValueOnce({ error: authError('same_password') });
    await expect(session().resetPassword('you@spellbinder.test', '123456', 'old-password')).rejects.toMatchObject({
      code: 'same_password',
    });
  });
});

describe('onAuthChange', () => {
  it('reports the user id, null when signed out, and unsubscribes', () => {
    const listener = jest.fn();
    const stop = session().onAuthChange(listener);
    const callback = mockClient.auth.onAuthStateChange.mock.calls[0][0];

    callback('SIGNED_IN', { user: { id: 'me' } });
    callback('SIGNED_OUT', null);
    expect(listener.mock.calls).toEqual([['me'], [null]]);

    stop();
    expect(mockClient.unsubscribe).toHaveBeenCalled();
  });
});

describe('signOut', () => {
  it('signs out of Supabase', async () => {
    await session().signOut();
    expect(mockClient.auth.signOut).toHaveBeenCalled();
  });
});
