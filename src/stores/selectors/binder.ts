import type { Card, CollectionItem, Deck } from '@/types';
import type { ManaColor } from '@/theme/colors';
import { getCardFaces, primaryType } from '@/utils/cards';
import { isFoil } from '@/utils/collection';

/** One binder tile: every version and finish row of a card, grouped by card id. */
export interface BinderEntry {
  cardId: string;
  /** Version shown on the tile (the first row's). */
  versionId: string;
  quantity: number;
  foilQuantity: number;
  /** Your decks that run this card. */
  deckIds: string[];
  /** Copies your decks use, summed over the decks. */
  inDecks: number;
  /** Copies no deck needs: `quantity − inDecks`, never below 0. 0 → none to spare. */
  spare: number;
}

export interface DeckUsage {
  deckIds: string[];
  /** Copies used, summed over the decks. */
  copies: number;
}

/** Per card id: which of your decks run it and how many copies they use in total. */
export function deckUsageByCard(decks: readonly Deck[]): Map<string, DeckUsage> {
  const map = new Map<string, DeckUsage>();
  for (const deck of decks) {
    for (const card of deck.cards) {
      const usage = map.get(card.cardId) ?? { deckIds: [], copies: 0 };
      if (!usage.deckIds.includes(deck.id)) usage.deckIds.push(deck.id);
      usage.copies += card.quantity;
      map.set(card.cardId, usage);
    }
  }
  return map;
}

export function buildBinderEntries(items: readonly CollectionItem[], decks: readonly Deck[]): BinderEntry[] {
  const usage = deckUsageByCard(decks);
  const entries = new Map<string, BinderEntry>();
  for (const item of items) {
    if (item.quantity <= 0) continue;
    const entry = entries.get(item.cardId);
    if (entry) {
      entry.quantity += item.quantity;
      if (isFoil(item)) entry.foilQuantity += item.quantity;
    } else {
      const used = usage.get(item.cardId);
      entries.set(item.cardId, {
        cardId: item.cardId,
        versionId: item.versionId,
        quantity: item.quantity,
        foilQuantity: isFoil(item) ? item.quantity : 0,
        deckIds: used?.deckIds ?? [],
        inDecks: used?.copies ?? 0,
        spare: 0,
      });
    }
  }
  for (const entry of entries.values()) entry.spare = Math.max(0, entry.quantity - entry.inDecks);
  return [...entries.values()];
}

export interface BinderTotals {
  /** Physical cards. */
  cards: number;
  /** Copies beyond what your decks use (3 Sol Rings in 2 decks → 1 spare). */
  spare: number;
  foils: number;
  /** Distinct cards. */
  unique: number;
}

export function binderTotals(entries: readonly BinderEntry[]): BinderTotals {
  let cards = 0;
  let spare = 0;
  let foils = 0;
  for (const entry of entries) {
    cards += entry.quantity;
    foils += entry.foilQuantity;
    spare += entry.spare;
  }
  return { cards, spare, foils, unique: entries.length };
}

export type BinderTypeFilter = 'all' | 'spare' | 'foils' | 'creatures' | 'instants' | 'artifacts' | 'lands';

export interface BinderFilters {
  query: string;
  /** Multi-select color identity filter; C matches colorless. Empty = all colors. */
  colors: readonly ManaColor[];
  type: BinderTypeFilter;
}

function matchesType(entry: BinderEntry, card: Card | undefined, type: BinderTypeFilter): boolean {
  if (type === 'all') return true;
  if (type === 'spare') return entry.spare > 0;
  if (type === 'foils') return entry.foilQuantity > 0;
  if (!card) return false;
  const typeLine = getCardFaces(card)[0].type_line ?? card.type_line;
  if (type === 'creatures') return primaryType(card) === 'Creature';
  if (type === 'instants') return typeLine.includes('Instant');
  if (type === 'artifacts') return typeLine.includes('Artifact');
  return typeLine.includes('Land');
}

function matchesColors(card: Card | undefined, colors: readonly ManaColor[]): boolean {
  if (colors.length === 0) return true;
  if (!card) return false;
  if (card.color_identity.length === 0) return colors.includes('C');
  return card.color_identity.some((color) => colors.includes(color as ManaColor));
}

/** Filters and sorts entries by card name. `cardOf` resolves an entry's printing. */
export function filterBinder(
  entries: readonly BinderEntry[],
  filters: BinderFilters,
  cardOf: (entry: BinderEntry) => Card | undefined,
): BinderEntry[] {
  const query = filters.query.trim().toLowerCase();
  return entries
    .map((entry) => ({ entry, card: cardOf(entry) }))
    .filter(({ entry, card }) => {
      if (query && !(card?.name.toLowerCase().includes(query) ?? false)) return false;
      return matchesType(entry, card, filters.type) && matchesColors(card, filters.colors);
    })
    .sort((a, b) => (a.card?.name ?? '').localeCompare(b.card?.name ?? ''))
    .map(({ entry }) => entry);
}
