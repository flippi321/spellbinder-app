import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { config } from '@/config';
import { getRepos } from '@/data';
import type { Card, Deck, DeckCard } from '@/types';
import { defaultCategoryFor } from '@/utils/category';
import { getOracleId, isBasicLand } from '@/utils/cards';
import { messageOf } from '@/utils/errors';

import { persistStorage, STORE_KEYS } from './storage';
import { useCardStore } from './useCardStore';
import { useSessionStore } from './useSessionStore';

export type AddToDeckResult = 'added' | 'already-in-deck';

interface DeckState {
  decks: Deck[];
  seeded: boolean;
  loading: boolean;
  error: string | null;
  load(ownerId: string): Promise<void>;
  /** New deck led by `commander`; it starts with just the commander. */
  createDeck(commander: Card): Promise<Deck>;
  /** Adds a card (singleton: a second copy only for basic lands). Stored by oracle id. */
  addCard(deckId: string, card: Card, options?: { category?: string; quantity?: number }): Promise<AddToDeckResult>;
  removeCard(deckId: string, oracleId: string): Promise<void>;
  /** Oracle "Apply these swaps": remove oracle ids, add cards. */
  applySwaps(deckId: string, remove: readonly string[], add: readonly { card: Card; category: string }[]): Promise<void>;
  reset(): void;
}

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => {
      const updateDeck = (deckId: string, change: (deck: Deck) => Deck) =>
        set((state) => ({ decks: state.decks.map((deck) => (deck.id === deckId ? change(deck) : deck)) }));

      const writeThrough = async (task: () => Promise<unknown>) => {
        try {
          await task();
        } catch (error) {
          set({ error: messageOf(error) });
        }
      };

      return {
        decks: [],
        seeded: false,
        loading: false,
        error: null,

        async load(ownerId) {
          if (!(config.dataMode === 'mock' && get().seeded)) {
            set({ loading: true, error: null });
            try {
              const decks = await getRepos().decks.list(ownerId);
              set({ decks, seeded: true, loading: false });
            } catch (error) {
              set({ loading: false, error: messageOf(error) });
            }
          }
          const oracleIds = get().decks.flatMap((deck) => deck.cards.map((card) => card.oracleId));
          await useCardStore.getState().ensureOracleIds(oracleIds).catch(() => undefined);
        },

        async createDeck(commander) {
          const ownerId = useSessionStore.getState().user?.id;
          if (!ownerId) throw new Error('Sign in to create decks.');
          useCardStore.getState().put([commander]);
          const commanderOracleId = getOracleId(commander);
          const deck = await getRepos().decks.create({
            ownerId,
            name: commander.name,
            commanderOracleId,
            theme: 'New deck',
            bracket: 2,
            cards: [{ oracleId: commanderOracleId, quantity: 1, category: 'Commander', isCommander: true }],
          });
          set((state) => ({ decks: [...state.decks, deck] }));
          return deck;
        },

        async addCard(deckId, card, { category, quantity = 1 } = {}) {
          const deck = get().decks.find((d) => d.id === deckId);
          if (!deck) throw new Error('Deck not found');
          useCardStore.getState().put([card]);
          const oracleId = getOracleId(card);
          const existing = deck.cards.find((c) => c.oracleId === oracleId);
          if (existing && !isBasicLand(card)) return 'already-in-deck';

          const slot: DeckCard = existing
            ? { ...existing, quantity: existing.quantity + quantity }
            : { oracleId, quantity: isBasicLand(card) ? quantity : 1, category: category ?? defaultCategoryFor(card), isCommander: false };
          updateDeck(deckId, (d) => ({ ...d, cards: [...d.cards.filter((c) => c.oracleId !== oracleId), slot] }));
          await writeThrough(() => getRepos().decks.upsertCard(deckId, slot));
          return 'added';
        },

        async removeCard(deckId, oracleId) {
          updateDeck(deckId, (d) => ({ ...d, cards: d.cards.filter((c) => c.oracleId !== oracleId) }));
          await writeThrough(() => getRepos().decks.removeCard(deckId, oracleId));
        },

        async applySwaps(deckId, remove, add) {
          for (const oracleId of remove) await get().removeCard(deckId, oracleId);
          for (const { card, category } of add) await get().addCard(deckId, card, { category });
        },

        reset: () => set({ decks: [], seeded: false, loading: false, error: null }),
      };
    },
    {
      name: STORE_KEYS.decks,
      version: 1,
      storage: persistStorage,
      partialize: ({ decks, seeded }) => ({ decks, seeded }),
    },
  ),
);
