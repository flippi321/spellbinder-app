import type { CollectionItem, Deck, DeckCard, Game, LoanRequest } from '@/types';
import { getCardId } from '@/utils/cards';

import { catalog } from './catalog';
import {
  nextThursdayAt19,
  PLAYGROUP,
  SEASON_WINNERS,
  SEED_DECKS,
  SEED_LOANS,
  type SeedCopy,
  type SeedDeck,
} from './seed';

/** Turns the name-based seed into domain objects keyed by real Scryfall ids. */

const SEEDED_AT = '2026-10-01T12:00:00.000Z';

export function collectionItemsFromSeed(userId: string, copies: readonly SeedCopy[]): CollectionItem[] {
  const items: CollectionItem[] = [];
  for (const copy of copies) {
    const card = catalog.require(copy.name);
    const foil = copy.foil ?? 0;
    const base = {
      userId,
      versionId: card.id,
      cardId: getCardId(card),
      condition: 'NM' as const,
      createdAt: SEEDED_AT,
    };
    if (copy.qty - foil > 0) items.push({ ...base, quantity: copy.qty - foil, finish: 'nonfoil' });
    if (foil > 0) items.push({ ...base, quantity: foil, finish: 'foil' });
  }
  return items;
}

export function decksFromSeed(ownerId: string, seeds: readonly SeedDeck[] = SEED_DECKS): Deck[] {
  return seeds.map((seed) => {
    const commanderCardId = getCardId(catalog.require(seed.commander));
    const cards: DeckCard[] = [
      { cardId: commanderCardId, quantity: 1, category: 'Commander', isCommander: true },
    ];
    for (const [category, slots] of Object.entries(seed.categories)) {
      for (const slot of slots) {
        const [name, quantity] = typeof slot === 'string' ? [slot, 1] : slot;
        cards.push({ cardId: getCardId(catalog.require(name)), quantity, category, isCommander: false });
      }
    }
    return {
      id: seed.id,
      ownerId,
      name: seed.name,
      commanderCardId,
      partnerCardId: null,
      theme: seed.theme,
      bracket: seed.bracket,
      createdAt: seed.createdAt,
      cards,
    };
  });
}

/** This season's games: two per Thursday, ending last Thursday. */
export function gamesFromSeed(now: Date): Game[] {
  const lastThursday = nextThursdayAt19(now);
  lastThursday.setDate(lastThursday.getDate() - 7);
  const newestIndex = SEASON_WINNERS.length - 1;
  return SEASON_WINNERS.map((winnerId, index) => {
    const age = newestIndex - index;
    const playedAt = new Date(lastThursday);
    playedAt.setDate(playedAt.getDate() - Math.floor(age / 2) * 7);
    playedAt.setHours(age % 2 === 0 ? 21 : 19, 30);
    return {
      id: `game-${index + 1}`,
      playgroupId: PLAYGROUP.id,
      playedAt: playedAt.toISOString(),
      winnerId,
      winnerCommanderCardId: null,
      gameNightId: null,
      playerCount: 4,
      durationMinutes: 75 + ((index * 17) % 50),
    };
  });
}

export function loansFromSeed(): LoanRequest[] {
  return SEED_LOANS.map(({ cardName, ...loan }) => ({
    ...loan,
    cardId: getCardId(catalog.require(cardName)),
  }));
}
