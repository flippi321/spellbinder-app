/**
 * The subset of Scryfall's card object (https://scryfall.com/docs/api/cards) Spellbinder uses.
 * Kept in Scryfall's snake_case so API responses and the `cards` cache table map 1:1.
 */
export type ImageSize = 'small' | 'normal' | 'large' | 'png' | 'art_crop' | 'border_crop';

export type ScryfallImageUris = Partial<Record<ImageSize, string>>;

export type Legality = 'legal' | 'not_legal' | 'restricted' | 'banned';

export interface ScryfallCardFace {
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  /** Only reversible cards put oracle_id on faces instead of the card. */
  oracle_id?: string;
  artist?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  image_uris?: ScryfallImageUris;
}

export interface ScryfallCard {
  object?: 'card';
  /** Scryfall printing id — collection items are stored by this. */
  id: string;
  /** Shared by every printing — deck cards are stored by this. Missing on reversible cards. */
  oracle_id?: string;
  name: string;
  layout: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  colors?: string[];
  color_identity: string[];
  legalities: Partial<Record<string, Legality>>;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  set: string;
  set_name?: string;
  collector_number: string;
  rarity: string;
  artist?: string;
  released_at?: string;
  finishes?: string[];
}

export type CardIdentifier =
  | { id: string }
  | { oracle_id: string }
  | { name: string }
  | { name: string; set: string }
  | { set: string; collector_number: string };

export interface ScryfallList<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  next_page?: string;
  total_cards?: number;
  /** Only on /cards/collection responses. */
  not_found?: CardIdentifier[];
  warnings?: string[];
}

export interface ScryfallCatalog {
  object: 'catalog';
  total_values: number;
  data: string[];
}

export interface ScryfallErrorBody {
  object: 'error';
  code: string;
  status: number;
  details: string;
  warnings?: string[];
}
