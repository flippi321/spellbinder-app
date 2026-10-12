import type { Card, Deck } from '@/types';

import { isLand, primaryType, type PrimaryType } from './cards';

export interface CurveBucket {
  /** "0" … "6", "7+" */
  label: string;
  count: number;
}

const CURVE_SLOTS = 8; // 0–6 and 7+

/** Nonland cards in the 99 (commanders excluded), bucketed by mana value. */
export function manaCurve(deck: Deck, cardOf: (oracleId: string) => Card | undefined): CurveBucket[] {
  const counts = new Array<number>(CURVE_SLOTS).fill(0);
  for (const slot of deck.cards) {
    const card = cardOf(slot.oracleId);
    if (!card || slot.isCommander || isLand(card)) continue;
    counts[Math.min(CURVE_SLOTS - 1, Math.floor(card.cmc))] += slot.quantity;
  }
  return counts.map((count, index) => ({ label: index === CURVE_SLOTS - 1 ? `${index}+` : String(index), count }));
}

export function averageManaValue(deck: Deck, cardOf: (oracleId: string) => Card | undefined): number {
  let total = 0;
  let cards = 0;
  for (const slot of deck.cards) {
    const card = cardOf(slot.oracleId);
    if (!card || slot.isCommander || isLand(card)) continue;
    total += card.cmc * slot.quantity;
    cards += slot.quantity;
  }
  return cards > 0 ? total / cards : 0;
}

/** Card counts by primary type, most common first. */
export function typeBreakdown(
  deck: Deck,
  cardOf: (oracleId: string) => Card | undefined,
): { type: PrimaryType; count: number }[] {
  const counts = new Map<PrimaryType, number>();
  for (const slot of deck.cards) {
    const card = cardOf(slot.oracleId);
    if (!card) continue;
    const type = primaryType(card);
    counts.set(type, (counts.get(type) ?? 0) + slot.quantity);
  }
  return [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}
