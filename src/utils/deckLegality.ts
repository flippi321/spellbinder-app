import type { Card, Deck } from '@/types';

import { isBasicLand, isCommanderLegal } from './cards';

export interface LegalityResult {
  legal: boolean;
  issues: string[];
}

const ANY_NUMBER = 'A deck can have any number of cards named';

/**
 * Basic Commander checks: 100 cards, singleton (basics and "any number" cards excepted),
 * Commander-legal cards, and color identity within the commander's. Cards whose data
 * isn't loaded yet are given the benefit of the doubt.
 */
export function checkCommanderDeck(deck: Deck, versionByCard: (cardId: string) => Card | undefined): LegalityResult {
  const issues: string[] = [];
  const size = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  if (size !== 100) issues.push(`${size} cards — Commander decks have exactly 100`);

  const commander = versionByCard(deck.commanderCardId);
  const partner = deck.partnerCardId ? versionByCard(deck.partnerCardId) : undefined;
  const identity = new Set([...(commander?.color_identity ?? []), ...(partner?.color_identity ?? [])]);

  for (const slot of deck.cards) {
    const card = versionByCard(slot.cardId);
    if (!card) continue;
    const anyNumber = isBasicLand(card) || (card.oracle_text ?? '').includes(ANY_NUMBER);
    if (slot.quantity > 1 && !anyNumber) issues.push(`${card.name}: more than one copy`);
    if (!isCommanderLegal(card)) issues.push(`${card.name}: not legal in Commander`);
    if (commander && card.color_identity.some((color) => !identity.has(color))) {
      issues.push(`${card.name}: outside the commander's colors`);
    }
  }
  return { legal: issues.length === 0, issues };
}
