import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { config } from '@/config';
import type { Database } from '@/types/database';

/** Typed by the generated schema (`npm run db:types`), so queries and rows are checked against the database. */
export type TypedSupabaseClient = SupabaseClient<Database>;

let client: TypedSupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

/**
 * The Supabase client, created on first use so mock mode never needs credentials.
 * Only the public URL + anon key live in the app; RLS protects the data, and secrets
 * (like the Anthropic key) live in Supabase function secrets.
 */
export function getSupabase(): TypedSupabaseClient {
  if (client) return client;
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (see .env.example).',
    );
  }

  const supabase = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  // Only refresh the session while the app is in the foreground (Supabase React Native guide).
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
  }

  client = supabase;
  return supabase;
}
