import type { CollectionItem, Deck, DeckCard, OwnershipStatus } from '@/types';
import { orderCategories } from '@/utils/category';

/**
 * "Do I own this?" — joins on card id, so any printing you own counts (CLAUDE.md).
 * Pure functions: stores keep raw data, screens derive views with these.
 */

export interface OwnershipIndex {
  /** Card ids you own at least one copy of. */
  owned: ReadonlySet<string>;
  /** Card id → ids of other playgroup members who own it. */
  friendOwners: ReadonlyMap<string, readonly string[]>;
}

export function buildOwnershipIndex(
  myItems: readonly CollectionItem[],
  memberItems: readonly CollectionItem[],
): OwnershipIndex {
  const owned = new Set<string>();
  for (const item of myItems) if (item.quantity > 0) owned.add(item.cardId);

  const friendOwners = new Map<string, string[]>();
  for (const item of memberItems) {
    if (item.quantity <= 0) continue;
    const owners = friendOwners.get(item.cardId) ?? [];
    if (!owners.includes(item.userId)) owners.push(item.userId);
    friendOwners.set(item.cardId, owners);
  }
  return { owned, friendOwners };
}

export function ownershipOf(cardId: string, index: OwnershipIndex): OwnershipStatus {
  if (index.owned.has(cardId)) return { kind: 'owned' };
  const owners = index.friendOwners.get(cardId);
  if (owners && owners.length > 0) return { kind: 'friend', ownerIds: [...owners] };
  return { kind: 'missing' };
}

export interface DeckSummary {
  deckId: string;
  /** Total cards, counting quantities (100 for a finished deck). */
  total: number;
  owned: number;
  /** Not yours, but a playgroup member has one. */
  inGroup: number;
  /** Nobody in the group has it. */
  missing: number;
  /** Everything you don't own (inGroup + missing) — the "6 missing" on deck tiles. */
  notOwned: number;
  ownedRatio: number;
  complete: boolean;
}

export function summarizeDeck(deck: Deck, index: OwnershipIndex): DeckSummary {
  let total = 0;
  let owned = 0;
  let inGroup = 0;
  for (const card of deck.cards) {
    total += card.quantity;
    const status = ownershipOf(card.cardId, index);
    if (status.kind === 'owned') owned += card.quantity;
    else if (status.kind === 'friend') inGroup += card.quantity;
  }
  const notOwned = total - owned;
  return {
    deckId: deck.id,
    total,
    owned,
    inGroup,
    missing: notOwned - inGroup,
    notOwned,
    ownedRatio: total > 0 ? owned / total : 0,
    complete: total > 0 && notOwned === 0,
  };
}

/** Distinct cards in your decks that you don't own but a friend does. */
export function friendFitCardIds(decks: readonly Deck[], index: OwnershipIndex): string[] {
  const ids = new Set<string>();
  for (const deck of decks) {
    for (const card of deck.cards) {
      if (ownershipOf(card.cardId, index).kind === 'friend') ids.add(card.cardId);
    }
  }
  return [...ids];
}

export interface DeckCardRow {
  slot: DeckCard;
  status: OwnershipStatus;
}

export interface DeckCategoryGroup {
  category: string;
  /** Card count including quantities. */
  count: number;
  rows: DeckCardRow[];
}

/** Deck cards grouped by category (Commander first, Lands last), rows sorted by name. */
export function groupDeckCards(
  deck: Deck,
  index: OwnershipIndex,
  nameOf: (cardId: string) => string,
): DeckCategoryGroup[] {
  return orderCategories(deck.cards.map((card) => card.category)).map((category) => {
    const rows = deck.cards
      .filter((card) => card.category === category)
      .map((slot) => ({ slot, status: ownershipOf(slot.cardId, index) }))
      .sort((a, b) => nameOf(a.slot.cardId).localeCompare(nameOf(b.slot.cardId)));
    return { category, count: rows.reduce((sum, row) => sum + row.slot.quantity, 0), rows };
  });
}
