import {
  autocomplete,
  getCollection,
  getNamedExact,
  getNamedFuzzy,
  getPrintings,
  ScryfallError,
} from '@/services/scryfall';
import type { Card, CollectionItem, Deck, Game, LoanRequest, Rsvp } from '@/types';
import { slimCard } from '@/utils/cards';
import { sameRow } from '@/utils/collection';
import { createId } from '@/utils/id';

import type {
  CardRepo,
  CollectionRepo,
  DeckRepo,
  PlaygroupRepo,
  Repos,
  SessionRepo,
} from '../repositories';
import { collectionItemsFromSeed, decksFromSeed, gamesFromSeed, loansFromSeed } from './builders';
import { catalog } from './catalog';
import {
  buildBinderSeed,
  FRIEND_COLLECTIONS,
  ME,
  PLAYGROUP,
  PROFILES,
  seedGameNight,
  SEED_RSVPS,
} from './seed';

/**
 * Mock mode: seed data in memory, with a short delay so loading states are visible.
 * Card lookups still use the real (rate-limited) Scryfall client and fall back to the
 * bundled catalog when offline.
 */

const latency = () =>
  process.env.NODE_ENV === 'test' ? Promise.resolve() : new Promise<void>((resolve) => setTimeout(resolve, 120));

/** True when Scryfall itself answered "no such card" (as opposed to being unreachable). */
const isNotFound = (error: unknown) => error instanceof ScryfallError && error.status === 404;

function createMockSessionRepo(): SessionRepo {
  const me = PROFILES.find((profile) => profile.id === ME) ?? null;
  return {
    // Mock mode is always signed in as the demo profile; the sign-in screen never shows.
    currentUser: async () => me,
    signIn: async () => me,
    signUp: async () => me,
    requestPasswordReset: async () => undefined,
    resetPassword: async () => me,
    onAuthChange: () => () => undefined,
    signOut: async () => undefined,
  };
}

function createMockCardRepo(): CardRepo {
  return {
    async getByIds(ids) {
      const found: Card[] = [];
      const missing: string[] = [];
      for (const id of ids) {
        const card = catalog.byId(id);
        if (card) found.push(card);
        else missing.push(id);
      }
      if (missing.length === 0) return found;
      try {
        const { cards } = await getCollection(missing.map((id) => ({ id })));
        return [...found, ...cards.map(slimCard)];
      } catch {
        return found;
      }
    },

    async getByCardIds(cardIds) {
      const found: Card[] = [];
      const missing: string[] = [];
      for (const cardId of cardIds) {
        const card = catalog.byCardId(cardId);
        if (card) found.push(card);
        else missing.push(cardId);
      }
      if (missing.length === 0) return found;
      try {
        const { cards } = await getCollection(missing.map((oracle_id) => ({ oracle_id })));
        return [...found, ...cards.map(slimCard)];
      } catch {
        return found;
      }
    },

    async findByName(name, { fuzzy = false } = {}) {
      try {
        return slimCard(await (fuzzy ? getNamedFuzzy(name) : getNamedExact(name)));
      } catch (error) {
        if (isNotFound(error)) return null;
        return catalog.byName(name) ?? null;
      }
    },

    async autocomplete(query) {
      try {
        return await autocomplete(query);
      } catch {
        return catalog.searchNames(query);
      }
    },

    async getPrintings(cardId) {
      try {
        return (await getPrintings(cardId)).map(slimCard);
      } catch {
        const card = catalog.byCardId(cardId);
        return card ? [card] : [];
      }
    },

    save: async () => undefined,
  };
}

function createMockCollectionRepo(): CollectionRepo {
  let items: CollectionItem[] | null = null;
  const all = () => (items ??= collectionItemsFromSeed(ME, buildBinderSeed()));

  return {
    async list(userId) {
      await latency();
      return userId === ME ? [...all()] : [];
    },
    async upsert(item) {
      items = [...all().filter((existing) => !sameRow(existing, item)), item];
      return item;
    },
    async remove(key) {
      items = all().filter((existing) => !sameRow(existing, key));
    },
  };
}

function createMockDeckRepo(): DeckRepo {
  let decks: Deck[] | null = null;
  const all = () => (decks ??= decksFromSeed(ME));
  const update = (deckId: string, change: (deck: Deck) => Deck) => {
    decks = all().map((deck) => (deck.id === deckId ? change(deck) : deck));
  };

  return {
    async list(ownerId) {
      await latency();
      return all().filter((deck) => deck.ownerId === ownerId);
    },
    async create(input) {
      const deck: Deck = { ...input, id: createId(), partnerCardId: null, createdAt: new Date().toISOString() };
      decks = [...all(), deck];
      return deck;
    },
    async upsertCard(deckId, card) {
      update(deckId, (deck) => ({
        ...deck,
        cards: [...deck.cards.filter((c) => c.cardId !== card.cardId), card],
      }));
    },
    async removeCard(deckId, cardId) {
      update(deckId, (deck) => ({ ...deck, cards: deck.cards.filter((c) => c.cardId !== cardId) }));
    },
  };
}

function createMockPlaygroupRepo(): PlaygroupRepo {
  let state: { rsvps: Rsvp[]; loans: LoanRequest[]; games: Game[] } | null = null;
  const current = () => (state ??= { rsvps: [...SEED_RSVPS], loans: loansFromSeed(), games: gamesFromSeed(new Date()) });

  return {
    async load(userId) {
      await latency();
      const s = current();
      return {
        playgroup: PLAYGROUP,
        members: PROFILES,
        nextGameNight: seedGameNight(new Date()),
        rsvps: s.rsvps,
        games: s.games,
        loans: s.loans.filter((loan) => loan.requesterId === userId || loan.ownerId === userId),
        memberItems: Object.entries(FRIEND_COLLECTIONS).flatMap(([memberId, copies]) =>
          collectionItemsFromSeed(memberId, copies),
        ),
      };
    },
    async setRsvp(rsvp) {
      const s = current();
      s.rsvps = [...s.rsvps.filter((r) => r.userId !== rsvp.userId || r.gameNightId !== rsvp.gameNightId), rsvp];
    },
    async updateLoan(loanId, status) {
      const s = current();
      s.loans = s.loans.map((loan) => (loan.id === loanId ? { ...loan, status } : loan));
    },
    async requestLoan(request) {
      const loan: LoanRequest = { ...request, id: createId(), status: 'pending', createdAt: new Date().toISOString() };
      current().loans.push(loan);
      return loan;
    },
    async logGame(game) {
      const saved: Game = { ...game, id: createId() };
      current().games.push(saved);
      return saved;
    },
  };
}

export function createMockRepos(): Repos {
  return {
    session: createMockSessionRepo(),
    cards: createMockCardRepo(),
    collection: createMockCollectionRepo(),
    decks: createMockDeckRepo(),
    playgroup: createMockPlaygroupRepo(),
  };
}
