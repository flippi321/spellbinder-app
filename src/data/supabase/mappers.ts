import type {
  Bracket,
  CardCondition,
  CardFinish,
  CollectionItem,
  Deck,
  DeckCard,
  Game,
  GameNight,
  LoanRequest,
  LoanStatus,
  Playgroup,
  Profile,
  Rsvp,
  RsvpStatus,
} from '@/types';
import type { ScryfallCard, ScryfallCardFace } from '@/types/scryfall';
import { avatarColors, type AvatarColor } from '@/theme/colors';

/**
 * Row shapes of the Supabase schema (spellbinder-db repo, supabase/migrations) and their camelCase domain twins.
 * TODO: replace these hand-written rows with `supabase gen types typescript` output.
 */

export interface ProfileRow {
  id: string;
  display_name: string;
  initials: string;
  avatar_color: string;
}

export interface PlaygroupRow {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
}

/** Rules of one face of a card (`cards.card_faces`). */
export interface CardFaceRow {
  name: string;
  mana_cost?: string;
  type_line?: string;
  rules_text?: string;
  colors?: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
}

/** One card, whatever the version. `id` is Scryfall's oracle_id. */
export interface CardRow {
  id: string;
  name: string;
  layout: string;
  mana_cost: string | null;
  cmc: number;
  type_line: string;
  rules_text: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  colors: string[] | null;
  color_identity: string[];
  legalities: ScryfallCard['legalities'];
  card_faces: CardFaceRow[] | null;
  updated_at?: string;
}

/** What one face looks like in one version (`card_versions.card_faces`). */
export interface CardVersionFaceRow {
  image_uris?: ScryfallCardFace['image_uris'];
  artist?: string;
}

/** One version (printing) of a card. `id` is Scryfall's id. */
export interface CardVersionRow {
  id: string;
  card_id: string;
  set: string;
  collector_number: string;
  rarity: string;
  artist: string | null;
  image_uris: ScryfallCard['image_uris'] | null;
  card_faces: CardVersionFaceRow[] | null;
  finishes: CardFinish[];
  updated_at?: string;
}

/** A version read with its card embedded: `select('*, card:cards(*)')`. */
export type CardVersionWithCardRow = CardVersionRow & { card: CardRow };

export interface CollectionItemRow {
  id: string;
  user_id: string;
  version_id: string;
  card_id: string;
  quantity: number;
  finish: CardFinish;
  condition: CardCondition;
  created_at: string;
  updated_at?: string;
}

export interface DeckCardRow {
  deck_id: string;
  card_id: string;
  quantity: number;
  category: string;
  is_commander: boolean;
}

export interface DeckRow {
  id: string;
  owner_id: string;
  name: string;
  commander_card_id: string;
  partner_card_id: string | null;
  theme: string | null;
  bracket: number;
  created_at: string;
  updated_at?: string;
  deck_cards?: DeckCardRow[];
}

export interface LoanRequestRow {
  id: string;
  card_id: string;
  requester_id: string;
  owner_id: string;
  status: string;
  note: string | null;
  created_at: string;
  updated_at?: string;
}

export interface GameNightRow {
  id: string;
  playgroup_id: string;
  starts_at: string;
  location: string | null;
  notes: string | null;
}

export interface RsvpRow {
  game_night_id: string;
  user_id: string;
  status: string;
}

export interface GameRow {
  id: string;
  playgroup_id: string;
  played_at: string;
  winner_id: string;
  winner_commander_card_id: string | null;
  game_night_id: string | null;
  player_count: number;
  duration_minutes: number | null;
}

const FINISHES: readonly CardFinish[] = ['nonfoil', 'foil', 'etched'];

export const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  displayName: row.display_name,
  initials: row.initials,
  avatarColor: row.avatar_color in avatarColors ? (row.avatar_color as AvatarColor) : 'gold',
});

export const toPlaygroup = (row: PlaygroupRow): Playgroup => ({
  id: row.id,
  name: row.name,
  inviteCode: row.invite_code,
  createdBy: row.created_by,
});

/** Joins a version and its card back into the Scryfall shape the app uses. Faces pair up by index. */
export const toCard = ({ card, ...version }: CardVersionWithCardRow): ScryfallCard => {
  const faces = card.card_faces?.map(
    (face, i): ScryfallCardFace => ({
      name: face.name,
      mana_cost: face.mana_cost,
      type_line: face.type_line,
      oracle_text: face.rules_text,
      colors: face.colors,
      power: face.power,
      toughness: face.toughness,
      loyalty: face.loyalty,
      artist: version.card_faces?.[i]?.artist,
      image_uris: version.card_faces?.[i]?.image_uris,
    }),
  );
  return {
    id: version.id,
    oracle_id: card.id,
    name: card.name,
    layout: card.layout,
    mana_cost: card.mana_cost ?? undefined,
    cmc: card.cmc,
    type_line: card.type_line,
    oracle_text: card.rules_text ?? undefined,
    power: card.power ?? undefined,
    toughness: card.toughness ?? undefined,
    loyalty: card.loyalty ?? undefined,
    colors: card.colors ?? undefined,
    color_identity: card.color_identity,
    legalities: card.legalities,
    image_uris: version.image_uris ?? undefined,
    card_faces: faces,
    set: version.set,
    collector_number: version.collector_number,
    rarity: version.rarity,
    artist: version.artist ?? undefined,
    finishes: version.finishes,
  };
};

/** Splits a Scryfall card into its `cards` row (rules) and its `card_versions` row (this printing). */
export const fromCard = (scryfall: ScryfallCard, cardId: string): { card: CardRow; version: CardVersionRow } => {
  const now = new Date().toISOString();
  const finishes = (scryfall.finishes ?? []).filter((f): f is CardFinish => FINISHES.includes(f as CardFinish));
  return {
    card: {
      id: cardId,
      name: scryfall.name,
      layout: scryfall.layout,
      mana_cost: scryfall.mana_cost ?? null,
      cmc: scryfall.cmc,
      type_line: scryfall.type_line,
      rules_text: scryfall.oracle_text ?? null,
      power: scryfall.power ?? null,
      toughness: scryfall.toughness ?? null,
      loyalty: scryfall.loyalty ?? null,
      colors: scryfall.colors ?? null,
      color_identity: scryfall.color_identity,
      legalities: scryfall.legalities,
      card_faces:
        scryfall.card_faces?.map((face) => ({
          name: face.name,
          mana_cost: face.mana_cost,
          type_line: face.type_line,
          rules_text: face.oracle_text,
          colors: face.colors,
          power: face.power,
          toughness: face.toughness,
          loyalty: face.loyalty,
        })) ?? null,
      updated_at: now,
    },
    version: {
      id: scryfall.id,
      card_id: cardId,
      set: scryfall.set,
      collector_number: scryfall.collector_number,
      rarity: scryfall.rarity,
      artist: scryfall.artist ?? null,
      image_uris: scryfall.image_uris ?? null,
      card_faces: scryfall.card_faces?.map((face) => ({ image_uris: face.image_uris, artist: face.artist })) ?? null,
      finishes: finishes.length > 0 ? finishes : ['nonfoil'],
      updated_at: now,
    },
  };
};

export const toCollectionItem = (row: CollectionItemRow): CollectionItem => ({
  id: row.id,
  userId: row.user_id,
  versionId: row.version_id,
  cardId: row.card_id,
  quantity: row.quantity,
  finish: row.finish,
  condition: row.condition,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** `updated_at` is left out: the database stamps it. */
export const fromCollectionItem = (item: CollectionItem): CollectionItemRow => ({
  id: item.id,
  user_id: item.userId,
  version_id: item.versionId,
  card_id: item.cardId,
  quantity: item.quantity,
  finish: item.finish,
  condition: item.condition,
  created_at: item.createdAt,
});

export const toDeckCard = (row: DeckCardRow): DeckCard => ({
  cardId: row.card_id,
  quantity: row.quantity,
  category: row.category,
  isCommander: row.is_commander,
});

export const fromDeckCard = (deckId: string, card: DeckCard): DeckCardRow => ({
  deck_id: deckId,
  card_id: card.cardId,
  quantity: card.quantity,
  category: card.category,
  is_commander: card.isCommander,
});

export const toDeck = (row: DeckRow): Deck => ({
  id: row.id,
  ownerId: row.owner_id,
  name: row.name,
  commanderCardId: row.commander_card_id,
  partnerCardId: row.partner_card_id,
  theme: row.theme ?? '',
  bracket: Math.min(5, Math.max(1, row.bracket)) as Bracket,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  cards: (row.deck_cards ?? []).map(toDeckCard),
});

export const toLoan = (row: LoanRequestRow): LoanRequest => ({
  id: row.id,
  cardId: row.card_id,
  requesterId: row.requester_id,
  ownerId: row.owner_id,
  status: row.status as LoanStatus,
  note: row.note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toGameNight = (row: GameNightRow): GameNight => ({
  id: row.id,
  playgroupId: row.playgroup_id,
  startsAt: row.starts_at,
  location: row.location ?? '',
  notes: row.notes,
});

export const toRsvp = (row: RsvpRow): Rsvp => ({
  gameNightId: row.game_night_id,
  userId: row.user_id,
  status: row.status as RsvpStatus,
});

export const fromRsvp = (rsvp: Rsvp): RsvpRow => ({
  game_night_id: rsvp.gameNightId,
  user_id: rsvp.userId,
  status: rsvp.status,
});

export const toGame = (row: GameRow): Game => ({
  id: row.id,
  playgroupId: row.playgroup_id,
  playedAt: row.played_at,
  winnerId: row.winner_id,
  winnerCommanderCardId: row.winner_commander_card_id,
  gameNightId: row.game_night_id,
  playerCount: row.player_count,
  durationMinutes: row.duration_minutes,
});
