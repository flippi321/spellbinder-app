import { useSyncExternalStore } from 'react';

import { setRepos } from '@/data';

import { useCardStore } from './useCardStore';
import { useCollectionStore } from './useCollectionStore';
import { useDeckStore } from './useDeckStore';
import { usePlaygroupStore } from './usePlaygroupStore';
import { useSessionStore } from './useSessionStore';
import { clearUserData, useDataOwnerStore, watchDataOwner } from './userData';

const persistedStores = [useCardStore, useCollectionStore, useDeckStore, useDataOwnerStore] as const;

const allHydrated = () => persistedStores.every((store) => store.persist.hasHydrated());

function subscribeToHydration(onChange: () => void) {
  const unsubscribes = persistedStores.map((store) => store.persist.onFinishHydration(onChange));
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

/** True once every persisted store has been restored from AsyncStorage. */
export function useStoresHydrated(): boolean {
  return useSyncExternalStore(subscribeToHydration, allHydrated, allHydrated);
}

/** Session first, then the signed-in user's data. Run once the persisted stores have hydrated. */
export async function bootstrapApp(): Promise<void> {
  // Sign-out, another user or another data mode clears the previous person's data before it can show.
  watchDataOwner();
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
  clearUserData();
  useCardStore.getState().reset();
  setRepos(null);
  await bootstrapApp();
}
