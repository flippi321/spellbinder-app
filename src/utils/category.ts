import type { Card, DeckCategory } from '@/types';

import { primaryType } from './cards';

/** Where a newly added card goes until the user re-categorizes it. */
export function defaultCategoryFor(card: Card): DeckCategory {
  switch (primaryType(card)) {
    case 'Land':
      return 'Lands';
    case 'Creature':
      return 'Creatures';
    case 'Planeswalker':
      return 'Planeswalkers';
    default:
      return 'Other';
  }
}

/** Commander first, Lands last, everything else in the order it first appears. */
export function orderCategories(categories: readonly DeckCategory[]): DeckCategory[] {
  const unique = [...new Set(categories)];
  const rank = (category: DeckCategory) => (category === 'Commander' ? 0 : category === 'Lands' ? 2 : 1);
  return unique
    .map((category, index) => ({ category, index }))
    .sort((a, b) => rank(a.category) - rank(b.category) || a.index - b.index)
    .map(({ category }) => category);
}
