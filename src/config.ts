import type { DataMode } from '@/types';

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
} = {
  dataMode: process.env.EXPO_PUBLIC_DATA_MODE === 'supabase' ? 'supabase' : 'mock',
  oracleMode: process.env.EXPO_PUBLIC_ORACLE_MODE === 'edge' ? 'edge' : 'mock',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};
