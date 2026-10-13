import type { Card, CardCondition, CardFinish, CollectionItem } from '@/types';

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
