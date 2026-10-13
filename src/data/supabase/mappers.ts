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
import type { Enums, Json, Tables, TablesInsert } from '@/types/database';
import type { ScryfallCard, ScryfallCardFace, ScryfallImageUris } from '@/types/scryfall';
import { avatarColors, type AvatarColor } from '@/theme/colors';

/**
 * Rows of the Supabase schema and their camelCase domain twins. The row types come from the generated
 * `src/types/database.ts` (`npm run db:types`), so a schema change that breaks a mapper fails `tsc`.
 */

export type ProfileRow = Tables<'profiles'>;
export type PlaygroupRow = Tables<'playgroups'>;
export type CardRow = Tables<'cards'>;
export type CardVersionRow = Tables<'card_versions'>;
export type CollectionItemRow = Tables<'collection_items'>;
export type DeckRow = Tables<'decks'>;
export type DeckCardRow = Tables<'deck_cards'>;
export type LoanRequestRow = Tables<'loan_requests'>;
export type GameNightRow = Tables<'game_nights'>;
export type RsvpRow = Tables<'rsvps'>;
export type GameRow = Tables<'games'>;

/** A version read with its card embedded: `select('*, card:cards(*)')`. */
export type CardVersionWithCardRow = CardVersionRow & { card: CardRow };

/** A deck read with its cards embedded: `select('*, deck_cards(*)')`. */
export type DeckWithCardsRow = DeckRow & { deck_cards?: DeckCardRow[] };

/**
 * What the jsonb columns hold. Declared with `type`, not `interface`: only type aliases are assignable to `Json`, which
 * is what lets the write mappers pass them to the typed client without a cast.
 */
/** Rules of one face of a card (`cards.card_faces`). */
export type CardFaceRow = {
  name: string;
  mana_cost?: string;
  type_line?: string;
  rules_text?: string;
  colors?: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
};

/** What one face looks like in one version (`card_versions.card_faces`). */
export type CardVersionFaceRow = {
  image_uris?: ScryfallImageUris;
  artist?: string;
};

/** Reads a jsonb column as the shape the write mappers put there. The one place the app trusts stored JSON. */
export const fromJson = <T>(value: Json): T => value as T;

/** Fails `tsc` when the domain unions and the database enums drift apart. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type DomainEnumsMatchDatabase = [
  Assert<Same<CardCondition, Enums<'card_condition'>>>,
  Assert<Same<CardFinish, Enums<'card_finish'>>>,
];

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
  const versionFaces = version.card_faces ? fromJson<CardVersionFaceRow[]>(version.card_faces) : undefined;
  const faces = card.card_faces
    ? fromJson<CardFaceRow[]>(card.card_faces).map(
        (face, i): ScryfallCardFace => ({
          name: face.name,
          mana_cost: face.mana_cost,
          type_line: face.type_line,
          oracle_text: face.rules_text,
          colors: face.colors,
          power: face.power,
          toughness: face.toughness,
          loyalty: face.loyalty,
          artist: versionFaces?.[i]?.artist,
          image_uris: versionFaces?.[i]?.image_uris,
        }),
      )
    : undefined;
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
    legalities: fromJson<ScryfallCard['legalities']>(card.legalities),
    image_uris: version.image_uris ? fromJson<ScryfallImageUris>(version.image_uris) : undefined,
    card_faces: faces,
    set: version.set,
    collector_number: version.collector_number,
    rarity: version.rarity,
    artist: version.artist ?? undefined,
    finishes: version.finishes,
  };
};

/** Splits a Scryfall card into its `cards` row (rules) and its `card_versions` row (this printing). */
export const fromCard = (
  scryfall: ScryfallCard,
  cardId: string,
): { card: TablesInsert<'cards'>; version: TablesInsert<'card_versions'> } => {
  const now = new Date().toISOString();
  const finishes = (scryfall.finishes ?? []).filter((f): f is CardFinish => FINISHES.includes(f as CardFinish));
  const cardFaces: CardFaceRow[] | null =
    scryfall.card_faces?.map((face) => ({
      name: face.name,
      mana_cost: face.mana_cost,
      type_line: face.type_line,
      rules_text: face.oracle_text,
      colors: face.colors,
      power: face.power,
      toughness: face.toughness,
      loyalty: face.loyalty,
    })) ?? null;
  const versionFaces: CardVersionFaceRow[] | null =
    scryfall.card_faces?.map((face) => ({ image_uris: face.image_uris, artist: face.artist })) ?? null;
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
      card_faces: cardFaces,
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
      card_faces: versionFaces,
      finishes: finishes.length > 0 ? finishes : ['nonfoil'],
      updated_at: now,
    },
  };
};

export const toCollectionItem = (row: CollectionItemRow): CollectionItem => ({
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
export const fromCollectionItem = (item: CollectionItem): TablesInsert<'collection_items'> => ({
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

export const fromDeckCard = (deckId: string, card: DeckCard): TablesInsert<'deck_cards'> => ({
  deck_id: deckId,
  card_id: card.cardId,
  quantity: card.quantity,
  category: card.category,
  is_commander: card.isCommander,
});

export const toDeck = (row: DeckWithCardsRow): Deck => ({
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

// Loan and RSVP statuses are `check` constraints in the database, not enums, so the generated type is `string`.
// The constraint guarantees one of the union's values; these casts narrow to it.

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

export const fromRsvp = (rsvp: Rsvp): TablesInsert<'rsvps'> => ({
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
