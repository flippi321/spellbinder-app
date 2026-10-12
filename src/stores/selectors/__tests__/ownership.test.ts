import type { CollectionItem, Deck, DeckCard } from '@/types';

import {
  buildOwnershipIndex,
  friendFitOracleIds,
  groupDeckCards,
  ownershipOf,
  summarizeDeck,
} from '../ownership';

const item = (userId: string, oracleId: string, quantity = 1): CollectionItem => ({
  id: `${userId}-${oracleId}`,
  userId,
  scryfallId: `print-${oracleId}`,
  oracleId,
  quantity,
  foil: false,
  condition: 'NM',
  createdAt: '2026-10-01T00:00:00.000Z',
});

const slot = (oracleId: string, category: string, quantity = 1): DeckCard => ({
  oracleId,
  category,
  quantity,
  isCommander: category === 'Commander',
});

const deck = (id: string, cards: DeckCard[]): Deck => ({
  id,
  ownerId: 'me',
  name: id,
  commanderOracleId: cards[0].oracleId,
  partnerOracleId: null,
  theme: '',
  bracket: 3,
  createdAt: '2026-10-01T00:00:00.000Z',
  cards,
});

// I own the commander, a ramp spell and 5 Forests; Jonas owns "tithe"; nobody owns "library".
const mine = [item('me', 'commander'), item('me', 'signet'), item('me', 'forest', 40)];
const friends = [item('jonas', 'tithe'), item('mira', 'tithe'), item('jonas', 'signet')];
const index = buildOwnershipIndex(mine, friends);

const atraxa = deck('atraxa', [
  slot('commander', 'Commander'),
  slot('forest', 'Lands', 5),
  slot('signet', 'Ramp'),
  slot('tithe', 'Ramp'),
  slot('library', 'Card draw'),
]);

describe('ownership selectors', () => {
  it('joins on oracle id: owned beats friend, friend beats missing', () => {
    expect(ownershipOf('signet', index)).toEqual({ kind: 'owned' });
    expect(ownershipOf('tithe', index)).toEqual({ kind: 'friend', ownerIds: ['jonas', 'mira'] });
    expect(ownershipOf('library', index)).toEqual({ kind: 'missing' });
  });

  it('ignores empty stacks', () => {
    const emptied = buildOwnershipIndex([item('me', 'signet', 0)], []);
    expect(ownershipOf('signet', emptied).kind).toBe('missing');
  });

  it('summarizes a deck counting quantities', () => {
    expect(summarizeDeck(atraxa, index)).toEqual({
      deckId: 'atraxa',
      total: 9,
      owned: 7,
      inGroup: 1,
      missing: 1,
      notOwned: 2,
      ownedRatio: 7 / 9,
      complete: false,
    });
  });

  it('marks a fully owned deck complete', () => {
    const krenko = deck('krenko', [slot('commander', 'Commander'), slot('forest', 'Lands', 10)]);
    expect(summarizeDeck(krenko, index)).toMatchObject({ complete: true, notOwned: 0, ownedRatio: 1 });
  });

  it('counts distinct friend-owned cards across decks once', () => {
    const second = deck('second', [slot('commander', 'Commander'), slot('tithe', 'Ramp')]);
    expect(friendFitOracleIds([atraxa, second], index)).toEqual(['tithe']);
  });

  it('groups by category with Commander first and Lands last', () => {
    const groups = groupDeckCards(atraxa, index, (oracleId) => oracleId);
    expect(groups.map((g) => g.category)).toEqual(['Commander', 'Ramp', 'Card draw', 'Lands']);
    expect(groups[1].rows.map((r) => [r.slot.oracleId, r.status.kind])).toEqual([
      ['signet', 'owned'],
      ['tithe', 'friend'],
    ]);
    expect(groups[3].count).toBe(5);
  });
});
