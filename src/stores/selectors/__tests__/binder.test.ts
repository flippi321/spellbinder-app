import type { Card, CollectionItem, Deck } from '@/types';

import { binderTotals, buildBinderEntries, filterBinder } from '../binder';

const card = (cardId: string, name: string, typeLine: string, identity: string[]): Card => ({
  id: `print-${cardId}`,
  oracle_id: cardId,
  name,
  layout: 'normal',
  cmc: 1,
  type_line: typeLine,
  color_identity: identity,
  legalities: { commander: 'legal' },
  set: 'tst',
  collector_number: '1',
  rarity: 'common',
});

const cards: Record<string, Card> = {
  sol: card('sol', 'Sol Ring', 'Artifact', []),
  counterspell: card('counterspell', 'Counterspell', 'Instant', ['U']),
  elves: card('elves', 'Llanowar Elves', 'Creature — Elf Druid', ['G']),
  pool: card('pool', 'Breeding Pool', 'Land — Forest Island', ['G', 'U']),
};

const stack = (cardId: string, quantity: number, foil = false, printing = `print-${cardId}`): CollectionItem => ({
  id: `${cardId}-${foil}-${printing}`,
  userId: 'me',
  versionId: printing,
  cardId,
  quantity,
  finish: foil ? 'foil' : 'nonfoil',
  condition: 'NM',
  createdAt: '2026-10-01T00:00:00.000Z',
});

const items = [
  stack('sol', 1),
  stack('sol', 1, true, 'print-sol-promo'),
  stack('counterspell', 2),
  stack('counterspell', 1, true),
  stack('elves', 4),
  stack('pool', 1),
];

const decks: Deck[] = [
  {
    id: 'd1',
    ownerId: 'me',
    name: 'D1',
    commanderCardId: 'x',
    partnerCardId: null,
    theme: '',
    bracket: 2,
    createdAt: '',
    cards: [
      { cardId: 'sol', quantity: 1, category: 'Ramp', isCommander: false },
      { cardId: 'pool', quantity: 1, category: 'Lands', isCommander: false },
    ],
  },
];

const entries = buildBinderEntries(items, decks);
const cardOf = (entry: { cardId: string }) => cards[entry.cardId];

describe('binder selectors', () => {
  it('groups printings and foils by card id', () => {
    const sol = entries.find((e) => e.cardId === 'sol');
    expect(sol).toMatchObject({ quantity: 2, foilQuantity: 1, deckIds: ['d1'], versionId: 'print-sol' });
  });

  it('counts cards, spare copies (cards in no deck) and foils', () => {
    expect(binderTotals(entries)).toEqual({ cards: 10, spare: 7, foils: 2, unique: 4 });
  });

  it('filters by color identity (C = colorless) and type chips', () => {
    const names = (filters: Parameters<typeof filterBinder>[1]) =>
      filterBinder(entries, filters, cardOf).map((e) => cardOf(e).name);

    expect(names({ query: '', colors: ['U'], type: 'all' })).toEqual(['Breeding Pool', 'Counterspell']);
    expect(names({ query: '', colors: ['C'], type: 'all' })).toEqual(['Sol Ring']);
    expect(names({ query: '', colors: [], type: 'spare' })).toEqual(['Counterspell', 'Llanowar Elves']);
    expect(names({ query: '', colors: [], type: 'foils' })).toEqual(['Counterspell', 'Sol Ring']);
    expect(names({ query: '', colors: [], type: 'creatures' })).toEqual(['Llanowar Elves']);
    expect(names({ query: '', colors: [], type: 'lands' })).toEqual(['Breeding Pool']);
    expect(names({ query: 'ring', colors: [], type: 'all' })).toEqual(['Sol Ring']);
  });
});
