import { SEED_DECKS, type SeedDeck } from './decks';

/** Copies of one card by name; `foil` of the `qty` copies are foil. */
export interface SeedCopy {
  name: string;
  qty: number;
  foil?: number;
}

/**
 * Deck cards you do NOT own. Every other card in your decks is in your binder.
 * Three of these are owned by friends (Smothering Tithe → Jonas, Doubling Season → Erik,
 * Cyclonic Rift → Erik, currently on loan to you): "3 cards friends own fit your decks".
 */
export const NOT_OWNED: readonly string[] = [
  // Atraxa — 6 missing
  'Smothering Tithe',
  'Doubling Season',
  'Sylvan Library',
  'Toxic Deluge',
  'Watery Grave',
  "Teferi's Protection",
  // Muldrotha — 12 missing (Watery Grave is listed above)
  'Cyclonic Rift',
  'Mana Drain',
  'Necropotence',
  'Polluted Delta',
  'Verdant Catacombs',
  'Misty Rainforest',
  "Uro, Titan of Nature's Wrath",
  'Boseiju, Who Endures',
  'Crucible of Worlds',
  'Seasons Past',
  'Reanimate',
  // Edgar — 5 missing
  'Bloodline Keeper',
  'Kalitas, Traitor of Ghet',
  'Olivia Voldaren',
  'Sorin, Imperious Bloodlord',
  "Akroma's Will",
];

/** Owned deck cards with more than one copy (or foils). Everything else defaults to 1 copy. */
export const DECK_CARD_COPIES: Record<string, Omit<SeedCopy, 'name'>> = {
  'Sol Ring': { qty: 2, foil: 1 },
  'Arcane Signet': { qty: 3 },
  'Command Tower': { qty: 4 },
  Cultivate: { qty: 3 },
  'Path to Exile': { qty: 2, foil: 1 },
  'Blood Artist': { qty: 2 },
  'Krenko, Mob Boss': { qty: 1, foil: 1 },
  "Atraxa, Praetors' Voice": { qty: 1, foil: 1 },
  'Lightning Bolt': { qty: 4, foil: 1 },
  'Swords to Plowshares': { qty: 2, foil: 1 },
  Brainstorm: { qty: 3 },
  Ponder: { qty: 2 },
  'Swiftfoot Boots': { qty: 2 },
  'Exotic Orchard': { qty: 3 },
  'Path of Ancestry': { qty: 2 },
  'Evolving Wilds': { qty: 4 },
  'Terramorphic Expanse': { qty: 3 },
  'Mind Stone': { qty: 2 },
  'Rhystic Study': { qty: 1, foil: 1 },
  'Goblin Bombardment': { qty: 1, foil: 1 },
  'Hardened Scales': { qty: 2 },
  'Sakura-Tribe Elder': { qty: 3 },
  'Eternal Witness': { qty: 2 },
  Plains: { qty: 60, foil: 8 },
  Island: { qty: 66, foil: 10 },
  Swamp: { qty: 70, foil: 10 },
  Mountain: { qty: 88, foil: 12 },
  Forest: { qty: 66, foil: 10 },
};

/** Cards in none of your decks ("Spare" in the binder). */
export const SPARES: SeedCopy[] = [
  { name: 'Counterspell', qty: 3, foil: 1 },
  { name: 'Skullclamp', qty: 1 },
  { name: 'The Wise Mothman', qty: 1 },
  { name: 'Fellwar Stone', qty: 3 },
  { name: 'Rampant Growth', qty: 4 },
  { name: 'Inspiring Call', qty: 2 },
  { name: "Stitcher's Supplier", qty: 2 },
  { name: 'Ruin Crab', qty: 2 },
  // The mill package the Oracle notices.
  { name: 'Mesmeric Orb', qty: 1 },
  { name: 'Bruvac the Grandiloquent', qty: 1 },
  { name: 'Maddening Cacophony', qty: 1 },
  { name: "Tasha's Hideous Laughter", qty: 1 },
  { name: 'Mind Funeral', qty: 3 },
  { name: 'Fraying Sanity', qty: 1 },
  { name: 'Glimpse the Unthinkable', qty: 1 },
  { name: 'Mindcrank', qty: 1 },
  { name: "Sphinx's Tutelage", qty: 1 },
  { name: 'Thought Scour', qty: 12 },
  { name: 'Armored Skaab', qty: 6 },
  { name: 'Millikin', qty: 4 },
  // Everyday staples and bulk.
  { name: 'Llanowar Elves', qty: 9, foil: 1 },
  { name: 'Elvish Mystic', qty: 8 },
  { name: 'Birds of Paradise', qty: 1 },
  { name: 'Dark Ritual', qty: 9 },
  { name: 'Opt', qty: 10 },
  { name: 'Duress', qty: 8 },
  { name: 'Giant Growth', qty: 12 },
  { name: 'Murder', qty: 8 },
  { name: 'Shock', qty: 12 },
  { name: 'Doom Blade', qty: 6 },
  { name: 'Lightning Helix', qty: 5 },
  { name: 'Mana Leak', qty: 8 },
  { name: 'Disenchant', qty: 8 },
  { name: 'Unsummon', qty: 12 },
  { name: 'Harmonize', qty: 5 },
  { name: 'Lightning Strike', qty: 9 },
  { name: 'Naturalize', qty: 9 },
  { name: 'Snow-Covered Plains', qty: 75 },
  { name: 'Snow-Covered Island', qty: 95, foil: 4 },
  { name: 'Snow-Covered Swamp', qty: 85 },
  { name: 'Snow-Covered Mountain', qty: 85 },
  { name: 'Snow-Covered Forest', qty: 88 },
];

/** Names of every card in the given decks (commanders included). */
export function deckCardNames(decks: readonly SeedDeck[] = SEED_DECKS): Set<string> {
  const names = new Set<string>();
  for (const deck of decks) {
    names.add(deck.commander);
    for (const slots of Object.values(deck.categories)) {
      for (const slot of slots) names.add(typeof slot === 'string' ? slot : slot[0]);
    }
  }
  return names;
}

/** Your binder: one copy of every owned deck card (or DECK_CARD_COPIES), plus spares. */
export function buildBinderSeed(decks: readonly SeedDeck[] = SEED_DECKS): SeedCopy[] {
  const notOwned = new Set(NOT_OWNED);
  const owned: SeedCopy[] = [];
  for (const name of deckCardNames(decks)) {
    if (notOwned.has(name)) continue;
    owned.push({ name, ...(DECK_CARD_COPIES[name] ?? { qty: 1 }) });
  }
  return [...owned, ...SPARES];
}
