import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { config } from '@/config';
import type { DataMode } from '@/types';

import { persistStorage, STORE_KEYS } from './storage';
import { useCollectionStore } from './useCollectionStore';
import { useDeckStore } from './useDeckStore';
import { useOracleStore } from './useOracleStore';
import { usePlaygroupStore } from './usePlaygroupStore';
import { useScanStore } from './useScanStore';
import { useSessionStore, type SessionStatus } from './useSessionStore';

/**
 * Personal data on this device belongs to one person in one data mode. The binder and decks persist
 * to fixed AsyncStorage keys, so this tag says whose they are: `<data mode>:<user id>`, or null when
 * they belong to nobody (signed out). When the session settles on someone else, everything personal
 * is cleared before their screens render.
 */
interface DataOwnerState {
  owner: string | null;
}

export const useDataOwnerStore = create<DataOwnerState>()(
  persist((): DataOwnerState => ({ owner: null }), { name: STORE_KEYS.owner, version: 1, storage: persistStorage }),
);

export const dataOwnerKey = (mode: DataMode, userId: string) => `${mode}:${userId}`;

/** Forget everything personal: binder, decks, playgroup, scan session and Oracle chat. The card cache isn't personal and stays. */
export function clearUserData(): void {
  useCollectionStore.getState().reset();
  useDeckStore.getState().reset();
  usePlaygroupStore.getState().reset();
  useScanStore.getState().endSession();
  useOracleStore.getState().reset();
}

/**
 * Clear personal data when it doesn't belong to the session: signed out, another user, or another
 * data mode (mock ↔ Supabase). While the session is unknown (loading, or offline at launch) the data
 * stays, so a signed-in user keeps their cached binder offline.
 */
export function syncDataOwner({ status, user }: { status: SessionStatus; user: { id: string } | null }): void {
  if (status !== 'signedIn' && status !== 'signedOut') return;
  const owner = status === 'signedIn' && user ? dataOwnerKey(config.dataMode, user.id) : null;
  if (owner === useDataOwnerStore.getState().owner) return;
  clearUserData();
  useDataOwnerStore.setState({ owner });
}

let stopWatching: (() => void) | null = null;

/** From now on, keep personal data in step with the session. Call after the stores have hydrated. Returns a stop function. */
export function watchDataOwner(): () => void {
  if (!stopWatching) {
    syncDataOwner(useSessionStore.getState());
    const unsubscribe = useSessionStore.subscribe(syncDataOwner);
    stopWatching = () => {
      unsubscribe();
      stopWatching = null;
    };
  }
  return stopWatching;
}
