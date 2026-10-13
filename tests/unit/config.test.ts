import type { config as Config } from '@/config';

type EnvKey = 'EXPO_PUBLIC_DATA_MODE' | 'EXPO_PUBLIC_TEST_USER_EMAIL' | 'EXPO_PUBLIC_TEST_USER_PASSWORD';
type Env = Partial<Record<EnvKey, string>>;
const ENV_KEYS: EnvKey[] = ['EXPO_PUBLIC_DATA_MODE', 'EXPO_PUBLIC_TEST_USER_EMAIL', 'EXPO_PUBLIC_TEST_USER_PASSWORD'];
const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const globals = globalThis as unknown as { __DEV__: boolean };
const savedDev = globals.__DEV__;

/** `config` is read once at import, so load a fresh copy for each environment. */
function loadConfig(env: Env, dev = true): typeof Config {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, env);
  globals.__DEV__ = dev;
  let loaded: typeof Config | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual<typeof import('@/config')>('@/config').config;
  });
  return loaded!;
}

afterEach(() => {
  globals.__DEV__ = savedDev;
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe('config.testUser', () => {
  const supabase: Env = { EXPO_PUBLIC_DATA_MODE: 'supabase' };
  const filled: Env = { EXPO_PUBLIC_TEST_USER_EMAIL: 'tester@spellbinder.test', EXPO_PUBLIC_TEST_USER_PASSWORD: 'password1' };

  it('is the account from .env, with the email trimmed and the password exact', () => {
    const { testUser } = loadConfig({
      ...supabase,
      EXPO_PUBLIC_TEST_USER_EMAIL: '  tester@spellbinder.test ',
      EXPO_PUBLIC_TEST_USER_PASSWORD: ' pass word ',
    });
    expect(testUser).toEqual({ email: 'tester@spellbinder.test', password: ' pass word ' });
  });

  it.each<[string, Env]>([
    ['both are missing', {}],
    ['both are empty', { EXPO_PUBLIC_TEST_USER_EMAIL: '', EXPO_PUBLIC_TEST_USER_PASSWORD: '' }],
    ['the email is blank', { EXPO_PUBLIC_TEST_USER_EMAIL: '  ', EXPO_PUBLIC_TEST_USER_PASSWORD: 'password1' }],
    ['the password is missing', { EXPO_PUBLIC_TEST_USER_EMAIL: 'tester@spellbinder.test' }],
  ])('is null when %s', (_case, env) => {
    expect(loadConfig({ ...supabase, ...env }).testUser).toBeNull();
  });

  it('is null in mock mode, which has no sign-in screen', () => {
    expect(loadConfig({ EXPO_PUBLIC_DATA_MODE: 'mock', ...filled }).testUser).toBeNull();
  });

  it('is null in a release build', () => {
    expect(loadConfig({ ...supabase, ...filled }, false).testUser).toBeNull();
  });
});
