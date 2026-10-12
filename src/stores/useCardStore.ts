import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getRepos } from '@/data';
import type { Card } from '@/types';
import { getOracleId, slimCard } from '@/utils/cards';

import { persistStorage, STORE_KEYS } from './storage';

/**
 * Normalized Scryfall card cache shared by the binder, decks, scan and card screens —
 * the local twin of the `cards` table. Persisted so owned cards render offline.
 */
interface CardState {
  /** By Scryfall printing id. */
  cards: Record<string, Card>;
  /** Oracle id → a printing id we have cached (index for deck/oracle lookups). */
  oracleToId: Record<string, string>;
  put(cards: readonly Card[]): void;
  ensureIds(ids: readonly string[]): Promise<void>;
  ensureOracleIds(oracleIds: readonly string[]): Promise<void>;
  findByName(name: string, options?: { fuzzy?: boolean }): Promise<Card | null>;
  autocomplete(query: string): Promise<string[]>;
  getPrintings(oracleId: string): Promise<Card[]>;
  reset(): void;
}

export const useCardStore = create<CardState>()(
  persist(
    (set, get) => ({
      cards: {},
      oracleToId: {},

      put(cards) {
        if (cards.length === 0) return;
        set((state) => {
          const nextCards = { ...state.cards };
          const nextIndex = { ...state.oracleToId };
          for (const card of cards) {
            const slim = slimCard(card);
            nextCards[slim.id] = slim;
            nextIndex[getOracleId(slim)] ??= slim.id;
          }
          return { cards: nextCards, oracleToId: nextIndex };
        });
      },

      async ensureIds(ids) {
        const missing = [...new Set(ids)].filter((id) => !get().cards[id]);
        if (missing.length === 0) return;
        get().put(await getRepos().cards.getByIds(missing));
      },

      async ensureOracleIds(oracleIds) {
        const missing = [...new Set(oracleIds)].filter((id) => !get().oracleToId[id]);
        if (missing.length === 0) return;
        get().put(await getRepos().cards.getByOracleIds(missing));
      },

      async findByName(name, options) {
        const card = await getRepos().cards.findByName(name, options);
        if (card) get().put([card]);
        return card;
      },

      autocomplete: (query) => getRepos().cards.autocomplete(query),

      async getPrintings(oracleId) {
        const printings = await getRepos().cards.getPrintings(oracleId);
        get().put(printings);
        return printings;
      },

      reset: () => set({ cards: {}, oracleToId: {} }),
    }),
    {
      name: STORE_KEYS.cards,
      version: 1,
      storage: persistStorage,
      partialize: ({ cards, oracleToId }) => ({ cards, oracleToId }),
    },
  ),
);

/** A cached card by printing id. */
export const useCard = (id: string | null | undefined) => useCardStore((state) => (id ? state.cards[id] : undefined));

/** A cached printing of the card with this oracle id. */
export const useCardByOracle = (oracleId: string | null | undefined) =>
  useCardStore((state) => {
    if (!oracleId) return undefined;
    const id = state.oracleToId[oracleId];
    return id ? state.cards[id] : undefined;
  });
