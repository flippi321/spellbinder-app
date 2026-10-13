import { useSyncExternalStore } from 'react';

import { setRepos } from '@/data';

import { useCardStore } from './useCardStore';
import { useCollectionStore } from './useCollectionStore';
import { useDeckStore } from './useDeckStore';
import { useOracleStore } from './useOracleStore';
import { usePlaygroupStore } from './usePlaygroupStore';
import { useScanStore } from './useScanStore';
import { useSessionStore } from './useSessionStore';

const persistedStores = [useCardStore, useCollectionStore, useDeckStore] as const;

const allHydrated = () => persistedStores.every((store) => store.persist.hasHydrated());

function subscribeToHydration(onChange: () => void) {
  const unsubscribes = persistedStores.map((store) => store.persist.onFinishHydration(onChange));
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

/** True once every persisted store has been restored from AsyncStorage. */
export function useStoresHydrated(): boolean {
  return useSyncExternalStore(subscribeToHydration, allHydrated, allHydrated);
}

/** Session first, then the signed-in user's data. */
export async function bootstrapApp(): Promise<void> {
  await useSessionStore.getState().init();
  await loadUserData();
}

/** Everything the tabs need for the signed-in user, in parallel (also run right after signing in). */
export async function loadUserData(): Promise<void> {
  const userId = useSessionStore.getState().user?.id;
  if (!userId) return;
  await Promise.all([
    useCollectionStore.getState().load(userId),
    useDeckStore.getState().load(userId),
    usePlaygroupStore.getState().load(userId),
  ]);
}

/** About → "Reset demo data": forget local changes and reload the seed. */
export async function resetDemoData(): Promise<void> {
  useCollectionStore.getState().reset();
  useDeckStore.getState().reset();
  useCardStore.getState().reset();
  useScanStore.getState().endSession();
  useOracleStore.getState().reset();
  setRepos(null);
  await bootstrapApp();
}
