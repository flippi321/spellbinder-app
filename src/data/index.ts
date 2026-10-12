import { config } from '@/config';

import { createMockRepos } from './mock/mockRepos';
import type { Repos } from './repositories';
import { createSupabaseRepos } from './supabase/supabaseRepos';

export type * from './repositories';

let repos: Repos | null = null;

/** The repositories for the current EXPO_PUBLIC_DATA_MODE (mock by default). */
export function getRepos(): Repos {
  repos ??= config.dataMode === 'supabase' ? createSupabaseRepos() : createMockRepos();
  return repos;
}

/** Swap implementations (tests) or reset to re-read the seed (`null`). */
export function setRepos(next: Repos | null): void {
  repos = next;
}
