import type { ImageSize, ScryfallCard, ScryfallCardFace } from '@/types/scryfall';

/** Oracle id of a card. Reversible cards only carry it on their faces. */
export function getOracleId(card: ScryfallCard): string {
  return card.oracle_id ?? card.card_faces?.[0]?.oracle_id ?? card.id;
}

/** Faces to render: the real faces for DFC/split/adventure cards, else the card itself. */
export function getCardFaces(card: ScryfallCard): ScryfallCardFace[] {
  if (card.card_faces && card.card_faces.length > 0) return card.card_faces;
  return [
    {
      name: card.name,
      mana_cost: card.mana_cost,
      type_line: card.type_line,
      oracle_text: card.oracle_text,
      colors: card.colors,
      artist: card.artist,
      power: card.power,
      toughness: card.toughness,
      loyalty: card.loyalty,
      image_uris: card.image_uris,
    },
  ];
}

const SIZE_FALLBACKS: Record<ImageSize, ImageSize[]> = {
  small: ['small', 'normal', 'large'],
  normal: ['normal', 'large', 'small'],
  large: ['large', 'normal', 'png'],
  png: ['png', 'large', 'normal'],
  art_crop: ['art_crop'],
  border_crop: ['border_crop', 'normal'],
};

/**
 * Image URL for a card. Double-faced cards keep images in `card_faces[].image_uris`
 * (split/adventure cards share the top-level `image_uris`).
 */
export function getImageUri(
  card: ScryfallCard | null | undefined,
  size: ImageSize = 'normal',
  face = 0,
): string | undefined {
  if (!card) return undefined;
  const sources = [card.image_uris, card.card_faces?.[face]?.image_uris, card.card_faces?.[0]?.image_uris];
  for (const candidate of SIZE_FALLBACKS[size]) {
    for (const uris of sources) {
      const uri = uris?.[candidate];
      if (uri) return uri;
    }
  }
  return undefined;
}

export function getArtist(card: ScryfallCard, face = 0): string | undefined {
  return card.card_faces?.[face]?.artist ?? card.artist;
}

export const isBasicLand = (card: ScryfallCard) => card.type_line.includes('Basic Land');

export const isLand = (card: ScryfallCard) => getCardFaces(card)[0].type_line?.includes('Land') ?? false;

export const isCommanderLegal = (card: ScryfallCard) => card.legalities.commander === 'legal';

/** Legendary creatures, plus anything whose text says it can be your commander. */
export function canBeCommander(card: ScryfallCard): boolean {
  const front = getCardFaces(card)[0];
  const typeLine = front.type_line ?? card.type_line;
  if (typeLine.includes('Legendary') && typeLine.includes('Creature')) return true;
  return (card.oracle_text ?? front.oracle_text ?? '').includes('can be your commander');
}

export type PrimaryType =
  | 'Creature'
  | 'Planeswalker'
  | 'Battle'
  | 'Instant'
  | 'Sorcery'
  | 'Artifact'
  | 'Enchantment'
  | 'Land'
  | 'Other';

const TYPE_PRIORITY: PrimaryType[] = [
  'Land',
  'Creature',
  'Planeswalker',
  'Battle',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
];

/** The single type a card is grouped under (artifact creatures count as creatures). */
export function primaryType(card: ScryfallCard): PrimaryType {
  const typeLine = getCardFaces(card)[0].type_line ?? card.type_line;
  return TYPE_PRIORITY.find((type) => typeLine.includes(type)) ?? 'Other';
}

/** Keep only the fields Spellbinder uses, so cached cards stay small. */
export function slimCard(card: ScryfallCard): ScryfallCard {
  const slimImages = (uris: ScryfallCard['image_uris']) =>
    uris
      ? { small: uris.small, normal: uris.normal, large: uris.large, art_crop: uris.art_crop }
      : undefined;
  return {
    id: card.id,
    oracle_id: card.oracle_id,
    name: card.name,
    layout: card.layout,
    mana_cost: card.mana_cost,
    cmc: card.cmc,
    type_line: card.type_line,
    oracle_text: card.oracle_text,
    power: card.power,
    toughness: card.toughness,
    loyalty: card.loyalty,
    colors: card.colors,
    color_identity: card.color_identity,
    legalities: { commander: card.legalities.commander },
    image_uris: slimImages(card.image_uris),
    card_faces: card.card_faces?.map((face) => ({
      name: face.name,
      mana_cost: face.mana_cost,
      type_line: face.type_line,
      oracle_text: face.oracle_text,
      colors: face.colors,
      oracle_id: face.oracle_id,
      artist: face.artist,
      power: face.power,
      toughness: face.toughness,
      loyalty: face.loyalty,
      image_uris: slimImages(face.image_uris),
    })),
    set: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    rarity: card.rarity,
    artist: card.artist,
    released_at: card.released_at,
    finishes: card.finishes,
  };
}
