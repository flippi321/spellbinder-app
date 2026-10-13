import type { DataMode } from '@/types';

/** An account to sign in as automatically (development only, see `config.testUser`). */
export interface TestUser {
  email: string;
  password: string;
}

/** Both values or nothing: if either is empty the sign-in screen works as usual. */
function testUserFrom(email = '', password = ''): TestUser | null {
  return email.trim() && password ? { email: email.trim(), password } : null;
}

const dataMode: DataMode = process.env.EXPO_PUBLIC_DATA_MODE === 'supabase' ? 'supabase' : 'mock';

/**
 * Runtime configuration from `.env` (see .env.example). EXPO_PUBLIC_* variables are inlined
 * at build time, so they must be read as literal `process.env.EXPO_PUBLIC_…` expressions.
 * Never put secrets here — everything in this file ships inside the app bundle.
 */
export const config: {
  dataMode: DataMode;
  oracleMode: 'mock' | 'edge';
  supabaseUrl: string;
  supabaseAnonKey: string;
  /**
   * Supabase mode in a development build: sign in as this account at launch (creating it the first time) instead
   * of showing the sign-in screen. Release builds drop it, since `__DEV__` is false there.
   */
  testUser: TestUser | null;
} = {
  dataMode,
  oracleMode: process.env.EXPO_PUBLIC_ORACLE_MODE === 'edge' ? 'edge' : 'mock',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  testUser:
    __DEV__ && dataMode === 'supabase'
      ? testUserFrom(process.env.EXPO_PUBLIC_TEST_USER_EMAIL, process.env.EXPO_PUBLIC_TEST_USER_PASSWORD)
      : null,
};
