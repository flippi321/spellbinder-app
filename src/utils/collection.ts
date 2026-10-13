import type { Card, CardCondition, CardFinish, CollectionItem, CollectionItemKey } from '@/types';

/** Best first. */
export const CARD_CONDITIONS: readonly CardCondition[] = ['M', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO'];

export const CONDITION_LABELS: Record<CardCondition, string> = {
  M: 'Mint',
  NM: 'Near Mint',
  EX: 'Excellent',
  GD: 'Good',
  LP: 'Light Played',
  PL: 'Played',
  PO: 'Poor',
};

/** New copies start Near Mint. */
export const DEFAULT_CONDITION: CardCondition = 'NM';

/** Foil and etched both count as foil in the UI (gold border, "foil" counts, the Foils filter). */
export const isFoil = (item: Pick<CollectionItem, 'finish'>) => item.finish !== 'nonfoil';

/** Same collection row: same user, version and finish (the table's primary key). */
export const sameRow = (a: CollectionItemKey, b: CollectionItemKey) =>
  a.userId === b.userId && a.versionId === b.versionId && a.finish === b.finish;

/** The finish of a copy from the foil toggle: etched when the version only comes etched, else plain foil. */
export function finishFor(card: Card, foil: boolean): CardFinish {
  if (!foil) return 'nonfoil';
  const finishes = card.finishes ?? [];
  return finishes.includes('etched') && !finishes.includes('foil') ? 'etched' : 'foil';
}

/**
 * A collection item saved before persist version 2 → today's shape: `oracleId`/`scryfallId` became `cardId`/`versionId`,
 * `foil: boolean` became `finish`, and the US grades became Cardmarket's (US LP is Cardmarket EX). Only for old data:
 * today's `LP` means Light Played, so running this on new items would downgrade them.
 */
const OLD_CONDITIONS: Record<string, CardCondition> = { NM: 'NM', LP: 'EX', MP: 'GD', HP: 'PL', DMG: 'PO' };

export function migrateCollectionItem(item: Record<string, unknown>): CollectionItem {
  const { foil, oracleId, scryfallId, ...rest } = item;
  return {
    ...rest,
    cardId: (rest.cardId ?? oracleId) as string,
    versionId: (rest.versionId ?? scryfallId) as string,
    finish: (rest.finish ?? (foil ? 'foil' : 'nonfoil')) as CardFinish,
    condition: OLD_CONDITIONS[rest.condition as string] ?? (rest.condition as CardCondition) ?? DEFAULT_CONDITION,
  } as CollectionItem;
}

/**
 * Stacks saved before persist version 3 → one item per row: stacks of the same version and finish (they differed only
 * in condition) become one, with the summed quantity, the first stack's condition and the earliest `createdAt`.
 * Drops the old `id`.
 */
export function mergeCollectionItems(items: readonly CollectionItem[]): CollectionItem[] {
  const merged: CollectionItem[] = [];
  for (const item of items) {
    const row = merged.find((existing) => sameRow(existing, item));
    if (row) {
      row.quantity += item.quantity;
      if (item.createdAt < row.createdAt) row.createdAt = item.createdAt;
      if (item.updatedAt && (!row.updatedAt || item.updatedAt > row.updatedAt)) row.updatedAt = item.updatedAt;
    } else {
      const { userId, versionId, cardId, quantity, finish, condition, createdAt, updatedAt } = item;
      merged.push({ userId, versionId, cardId, quantity, finish, condition, createdAt, ...(updatedAt && { updatedAt }) });
    }
  }
  return merged;
}
