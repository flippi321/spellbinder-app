import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getRepos } from '@/data';
import type { Card } from '@/types';
import { getCardId, slimCard } from '@/utils/cards';

import { persistStorage, STORE_KEYS } from './storage';

/**
 * Normalized Scryfall card cache shared by the binder, decks, scan and card screens —
 * the local twin of the `card_versions` + `cards` tables. Persisted so owned cards render offline.
 */
interface CardState {
  /** By version id. */
  cards: Record<string, Card>;
  /** Card id → a version id we have cached (index for deck lookups). */
  versionIdByCardId: Record<string, string>;
  put(cards: readonly Card[]): void;
  ensureIds(ids: readonly string[]): Promise<void>;
  ensureCardIds(cardIds: readonly string[]): Promise<void>;
  findByName(name: string, options?: { fuzzy?: boolean }): Promise<Card | null>;
  autocomplete(query: string): Promise<string[]>;
  getPrintings(cardId: string): Promise<Card[]>;
  reset(): void;
}

export const useCardStore = create<CardState>()(
  persist(
    (set, get) => ({
      cards: {},
      versionIdByCardId: {},

      put(cards) {
        if (cards.length === 0) return;
        set((state) => {
          const nextCards = { ...state.cards };
          const nextIndex = { ...state.versionIdByCardId };
          for (const card of cards) {
            const slim = slimCard(card);
            nextCards[slim.id] = slim;
            nextIndex[getCardId(slim)] ??= slim.id;
          }
          return { cards: nextCards, versionIdByCardId: nextIndex };
        });
      },

      async ensureIds(ids) {
        const missing = [...new Set(ids)].filter((id) => !get().cards[id]);
        if (missing.length === 0) return;
        get().put(await getRepos().cards.getByIds(missing));
      },

      async ensureCardIds(cardIds) {
        const missing = [...new Set(cardIds)].filter((id) => !get().versionIdByCardId[id]);
        if (missing.length === 0) return;
        get().put(await getRepos().cards.getByCardIds(missing));
      },

      async findByName(name, options) {
        const card = await getRepos().cards.findByName(name, options);
        if (card) get().put([card]);
        return card;
      },

      autocomplete: (query) => getRepos().cards.autocomplete(query),

      async getPrintings(cardId) {
        const printings = await getRepos().cards.getPrintings(cardId);
        get().put(printings);
        return printings;
      },

      reset: () => set({ cards: {}, versionIdByCardId: {} }),
    }),
    {
      name: STORE_KEYS.cards,
      version: 2,
      storage: persistStorage,
      partialize: ({ cards, versionIdByCardId }) => ({ cards, versionIdByCardId }),
      // v1 called the index `oracleToId`.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as { cards?: Record<string, Card>; oracleToId?: Record<string, string> };
        if (version < 2) return { cards: state.cards ?? {}, versionIdByCardId: state.oracleToId ?? {} };
        return persisted as Pick<CardState, 'cards' | 'versionIdByCardId'>;
      },
    },
  ),
);

/** A cached card by version id. */
export const useCard = (id: string | null | undefined) => useCardStore((state) => (id ? state.cards[id] : undefined));

/** A cached printing of the card with this card id. */
export const useCardByCardId = (cardId: string | null | undefined) =>
  useCardStore((state) => {
    if (!cardId) return undefined;
    const id = state.versionIdByCardId[cardId];
    return id ? state.cards[id] : undefined;
  });
