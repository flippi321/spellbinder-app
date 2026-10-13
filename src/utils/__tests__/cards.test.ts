import type { ScryfallCard } from '@/types/scryfall';

import { canBeCommander, getImageUri, getCardId, primaryType } from '../cards';

const base: ScryfallCard = {
  id: 'print-1',
  oracle_id: 'oracle-1',
  name: 'Sol Ring',
  layout: 'normal',
  cmc: 1,
  type_line: 'Artifact',
  color_identity: [],
  legalities: { commander: 'legal' },
  set: 'cmm',
  collector_number: '1',
  rarity: 'uncommon',
  image_uris: { small: 'small.jpg', normal: 'normal.jpg', art_crop: 'art.jpg' },
};

const doubleFaced: ScryfallCard = {
  ...base,
  id: 'print-2',
  name: 'Delver of Secrets // Insectile Aberration',
  layout: 'transform',
  type_line: 'Creature — Human Wizard // Creature — Human Insect',
  image_uris: undefined,
  card_faces: [
    { name: 'Delver of Secrets', image_uris: { normal: 'front.jpg', art_crop: 'front-art.jpg' } },
    { name: 'Insectile Aberration', image_uris: { normal: 'back.jpg' } },
  ],
};

describe('card helpers', () => {
  it('reads images from the card, or from card_faces for double-faced cards', () => {
    expect(getImageUri(base, 'normal')).toBe('normal.jpg');
    expect(getImageUri(doubleFaced, 'normal')).toBe('front.jpg');
    expect(getImageUri(doubleFaced, 'normal', 1)).toBe('back.jpg');
    expect(getImageUri(doubleFaced, 'art_crop')).toBe('front-art.jpg');
  });

  it('falls back to a nearby size and handles missing cards', () => {
    expect(getImageUri(base, 'large')).toBe('normal.jpg');
    expect(getImageUri(null)).toBeUndefined();
  });

  it('finds the card id on reversible cards', () => {
    const reversible: ScryfallCard = {
      ...base,
      oracle_id: undefined,
      card_faces: [{ name: 'A', oracle_id: 'face-oracle' }],
    };
    expect(getCardId(base)).toBe('oracle-1');
    expect(getCardId(reversible)).toBe('face-oracle');
  });

  it('classifies types and commanders', () => {
    expect(primaryType(base)).toBe('Artifact');
    expect(primaryType({ ...base, type_line: 'Artifact Creature — Golem' })).toBe('Creature');
    expect(canBeCommander({ ...base, type_line: 'Legendary Creature — Goblin Warrior' })).toBe(true);
    expect(canBeCommander(base)).toBe(false);
  });
});
