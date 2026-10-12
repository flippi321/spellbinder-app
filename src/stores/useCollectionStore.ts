import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { config } from '@/config';
import { getRepos } from '@/data';
import type { Card, CollectionItem } from '@/types';
import { getOracleId } from '@/utils/cards';
import { messageOf } from '@/utils/errors';
import { createId } from '@/utils/id';

import { persistStorage, STORE_KEYS } from './storage';
import { useCardStore } from './useCardStore';
import { useSessionStore } from './useSessionStore';

interface CollectionState {
  items: CollectionItem[];
  /** First load from the repository has happened (mock mode then treats local data as truth). */
  seeded: boolean;
  loading: boolean;
  error: string | null;
  load(userId: string): Promise<void>;
  /** Add copies of a printing (merges into an existing NM stack). */
  addCard(card: Card, options?: { quantity?: number; foil?: boolean }): Promise<void>;
  /** +1 adds a non-foil copy of `card`; −1 removes one copy of the same card (this printing first). */
  changeQuantity(card: Card, delta: 1 | -1): Promise<void>;
  reset(): void;
}

function requireUserId(): string {
  const id = useSessionStore.getState().user?.id;
  if (!id) throw new Error('Sign in to change your binder.');
  return id;
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => {
      /** Optimistic local change, then write through the repository. */
      const save = async (item: CollectionItem) => {
        set((state) => ({ items: [...state.items.filter((i) => i.id !== item.id), item], error: null }));
        try {
          await getRepos().collection.upsert(item);
        } catch (error) {
          set({ error: messageOf(error) });
        }
      };

      const removeItem = async (item: CollectionItem) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== item.id), error: null }));
        try {
          await getRepos().collection.remove(item.id);
        } catch (error) {
          set({ error: messageOf(error) });
        }
      };

      return {
        items: [],
        seeded: false,
        loading: false,
        error: null,

        async load(userId) {
          // Mock mode: the seed only fills an empty binder; after that local data is the truth.
          // Supabase mode: always refresh from the server.
          if (!(config.dataMode === 'mock' && get().seeded)) {
            set({ loading: true, error: null });
            try {
              const items = await getRepos().collection.list(userId);
              set({ items, seeded: true, loading: false });
            } catch (error) {
              set({ loading: false, error: messageOf(error) });
            }
          }
          await useCardStore
            .getState()
            .ensureIds(get().items.map((item) => item.scryfallId))
            .catch(() => undefined);
        },

        async addCard(card, { quantity = 1, foil = false } = {}) {
          const userId = requireUserId();
          useCardStore.getState().put([card]);
          // Supabase: collection_items.scryfall_id references the shared `cards` cache.
          await getRepos()
            .cards.save([card])
            .catch(() => undefined);

          const existing = get().items.find(
            (item) => item.scryfallId === card.id && item.foil === foil && item.condition === 'NM',
          );
          await save(
            existing
              ? { ...existing, quantity: existing.quantity + quantity }
              : {
                  id: createId(),
                  userId,
                  scryfallId: card.id,
                  oracleId: getOracleId(card),
                  quantity,
                  foil,
                  condition: 'NM',
                  createdAt: new Date().toISOString(),
                },
          );
        },

        async changeQuantity(card, delta) {
          if (delta > 0) return get().addCard(card, { quantity: 1 });
          const oracleId = getOracleId(card);
          const stacks = get().items.filter((item) => item.oracleId === oracleId && item.quantity > 0);
          const target =
            stacks.find((item) => item.scryfallId === card.id && !item.foil) ??
            stacks.find((item) => !item.foil) ??
            stacks[0];
          if (!target) return;
          if (target.quantity > 1) await save({ ...target, quantity: target.quantity - 1 });
          else await removeItem(target);
        },

        reset: () => set({ items: [], seeded: false, loading: false, error: null }),
      };
    },
    {
      name: STORE_KEYS.collection,
      version: 1,
      storage: persistStorage,
      partialize: ({ items, seeded }) => ({ items, seeded }),
    },
  ),
);
