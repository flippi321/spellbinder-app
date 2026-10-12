import { MOCK_SCAN_NAMES } from '@/services/scanSamples';

import { buildBinderSeed, deckCardNames } from './binder';
import { FRIEND_COLLECTIONS, SEED_LOANS } from './playgroup';

export * from './binder';
export * from './decks';
export * from './playgroup';

/** Cards the canned Oracle answers mention (chips, featured commander). */
export const ORACLE_CARD_NAMES: readonly string[] = [
  'Fellwar Stone',
  'Rampant Growth',
  'Mystic Remora',
  'Inspiring Call',
  "Karn's Bastion",
  'The Wise Mothman',
  "Stitcher's Supplier",
  'Ruin Crab',
  'Hardened Scales',
  'Winding Constrictor',
  'Exquisite Blood',
  'Sanguine Bond',
  'Skullclamp',
];

/** Every card name the seed references — the input for `npm run seed:cards`. */
export function allSeedCardNames(): string[] {
  const names = new Set<string>(deckCardNames());
  for (const copy of buildBinderSeed()) names.add(copy.name);
  for (const copies of Object.values(FRIEND_COLLECTIONS)) for (const copy of copies) names.add(copy.name);
  for (const loan of SEED_LOANS) names.add(loan.cardName);
  for (const name of [...MOCK_SCAN_NAMES, ...ORACLE_CARD_NAMES]) names.add(name);
  return [...names].sort((a, b) => a.localeCompare(b));
}
