import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { config } from '@/config';
import { getRepos } from '@/data';
import type { Card, Deck, DeckCard } from '@/types';
import { defaultCategoryFor } from '@/utils/category';
import { getCardId, isBasicLand } from '@/utils/cards';
import { messageOf } from '@/utils/errors';

import { persistStorage, STORE_KEYS } from './storage';
import { useCardStore } from './useCardStore';
import { useSessionStore } from './useSessionStore';

export type AddToDeckResult = 'added' | 'already-in-deck';

/** A deck saved before persist version 2 → today's names (oracle ids became card ids). */
function migrateDeck(deck: Record<string, unknown>): Deck {
  const { commanderOracleId, partnerOracleId, ...rest } = deck;
  const cards = (rest.cards ?? []) as Record<string, unknown>[];
  return {
    ...rest,
    commanderCardId: rest.commanderCardId ?? commanderOracleId,
    partnerCardId: rest.partnerCardId ?? partnerOracleId ?? null,
    cards: cards.map(({ oracleId, ...card }) => ({ ...card, cardId: card.cardId ?? oracleId })),
  } as Deck;
}

interface DeckState {
  decks: Deck[];
  seeded: boolean;
  loading: boolean;
  error: string | null;
  load(ownerId: string): Promise<void>;
  /** New deck led by `commander`; it starts with just the commander. */
  createDeck(commander: Card): Promise<Deck>;
  /** Adds a card (singleton: a second copy only for basic lands). Stored by card id. */
  addCard(deckId: string, card: Card, options?: { category?: string; quantity?: number }): Promise<AddToDeckResult>;
  removeCard(deckId: string, cardId: string): Promise<void>;
  /** Oracle "Apply these swaps": remove card ids, add cards. */
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
          const cardIds = get().decks.flatMap((deck) => deck.cards.map((card) => card.cardId));
          await useCardStore.getState().ensureCardIds(cardIds).catch(() => undefined);
        },

        async createDeck(commander) {
          const ownerId = useSessionStore.getState().user?.id;
          if (!ownerId) throw new Error('Sign in to create decks.');
          useCardStore.getState().put([commander]);
          const commanderCardId = getCardId(commander);
          const deck = await getRepos().decks.create({
            ownerId,
            name: commander.name,
            commanderCardId,
            theme: 'New deck',
            bracket: 2,
            cards: [{ cardId: commanderCardId, quantity: 1, category: 'Commander', isCommander: true }],
          });
          set((state) => ({ decks: [...state.decks, deck] }));
          return deck;
        },

        async addCard(deckId, card, { category, quantity = 1 } = {}) {
          const deck = get().decks.find((d) => d.id === deckId);
          if (!deck) throw new Error('Deck not found');
          useCardStore.getState().put([card]);
          const cardId = getCardId(card);
          const existing = deck.cards.find((c) => c.cardId === cardId);
          if (existing && !isBasicLand(card)) return 'already-in-deck';

          const slot: DeckCard = existing
            ? { ...existing, quantity: existing.quantity + quantity }
            : { cardId, quantity: isBasicLand(card) ? quantity : 1, category: category ?? defaultCategoryFor(card), isCommander: false };
          updateDeck(deckId, (d) => ({ ...d, cards: [...d.cards.filter((c) => c.cardId !== cardId), slot] }));
          await writeThrough(() => getRepos().decks.upsertCard(deckId, slot));
          return 'added';
        },

        async removeCard(deckId, cardId) {
          updateDeck(deckId, (d) => ({ ...d, cards: d.cards.filter((c) => c.cardId !== cardId) }));
          await writeThrough(() => getRepos().decks.removeCard(deckId, cardId));
        },

        async applySwaps(deckId, remove, add) {
          for (const cardId of remove) await get().removeCard(deckId, cardId);
          for (const { card, category } of add) await get().addCard(deckId, card, { category });
        },

        reset: () => set({ decks: [], seeded: false, loading: false, error: null }),
      };
    },
    {
      name: STORE_KEYS.decks,
      version: 2,
      storage: persistStorage,
      partialize: ({ decks, seeded }) => ({ decks, seeded }),
      // v1 decks named card ids oracleId / commanderOracleId / partnerOracleId.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as { decks?: Record<string, unknown>[]; seeded?: boolean };
        if (version < 2) return { decks: (state.decks ?? []).map(migrateDeck), seeded: state.seeded ?? false };
        return persisted as Pick<DeckState, 'decks' | 'seeded'>;
      },
    },
  ),
);
