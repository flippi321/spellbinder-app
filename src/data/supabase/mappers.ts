import type {
  Bracket,
  CardCondition,
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
import type { ScryfallCard } from '@/types/scryfall';
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

export interface CardRow {
  scryfall_id: string;
  oracle_id: string;
  name: string;
  layout: string;
  mana_cost: string | null;
  cmc: number;
  type_line: string;
  oracle_text: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  colors: string[] | null;
  color_identity: string[];
  legalities: ScryfallCard['legalities'];
  image_uris: ScryfallCard['image_uris'] | null;
  card_faces: ScryfallCard['card_faces'] | null;
  set: string;
  collector_number: string;
  rarity: string;
  artist: string | null;
  updated_at?: string;
}

export interface CollectionItemRow {
  id: string;
  user_id: string;
  scryfall_id: string;
  oracle_id: string;
  quantity: number;
  foil: boolean;
  condition: string;
  created_at: string;
}

export interface DeckCardRow {
  deck_id: string;
  oracle_id: string;
  quantity: number;
  category: string;
  is_commander: boolean;
}

export interface DeckRow {
  id: string;
  owner_id: string;
  name: string;
  commander_oracle_id: string;
  partner_oracle_id: string | null;
  theme: string | null;
  bracket: number;
  created_at: string;
  deck_cards?: DeckCardRow[];
}

export interface LoanRequestRow {
  id: string;
  card_oracle_id: string;
  requester_id: string;
  owner_id: string;
  status: string;
  note: string | null;
  created_at: string;
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
  winner_commander_oracle_id: string | null;
  player_count: number;
  duration_minutes: number | null;
}

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

export const toCard = (row: CardRow): ScryfallCard => ({
  id: row.scryfall_id,
  oracle_id: row.oracle_id,
  name: row.name,
  layout: row.layout,
  mana_cost: row.mana_cost ?? undefined,
  cmc: row.cmc,
  type_line: row.type_line,
  oracle_text: row.oracle_text ?? undefined,
  power: row.power ?? undefined,
  toughness: row.toughness ?? undefined,
  loyalty: row.loyalty ?? undefined,
  colors: row.colors ?? undefined,
  color_identity: row.color_identity,
  legalities: row.legalities,
  image_uris: row.image_uris ?? undefined,
  card_faces: row.card_faces ?? undefined,
  set: row.set,
  collector_number: row.collector_number,
  rarity: row.rarity,
  artist: row.artist ?? undefined,
});

export const fromCard = (card: ScryfallCard, oracleId: string): CardRow => ({
  scryfall_id: card.id,
  oracle_id: oracleId,
  name: card.name,
  layout: card.layout,
  mana_cost: card.mana_cost ?? null,
  cmc: card.cmc,
  type_line: card.type_line,
  oracle_text: card.oracle_text ?? null,
  power: card.power ?? null,
  toughness: card.toughness ?? null,
  loyalty: card.loyalty ?? null,
  colors: card.colors ?? null,
  color_identity: card.color_identity,
  legalities: card.legalities,
  image_uris: card.image_uris ?? null,
  card_faces: card.card_faces ?? null,
  set: card.set,
  collector_number: card.collector_number,
  rarity: card.rarity,
  artist: card.artist ?? null,
  updated_at: new Date().toISOString(),
});

export const toCollectionItem = (row: CollectionItemRow): CollectionItem => ({
  id: row.id,
  userId: row.user_id,
  scryfallId: row.scryfall_id,
  oracleId: row.oracle_id,
  quantity: row.quantity,
  foil: row.foil,
  condition: row.condition as CardCondition,
  createdAt: row.created_at,
});

export const fromCollectionItem = (item: CollectionItem): CollectionItemRow => ({
  id: item.id,
  user_id: item.userId,
  scryfall_id: item.scryfallId,
  oracle_id: item.oracleId,
  quantity: item.quantity,
  foil: item.foil,
  condition: item.condition,
  created_at: item.createdAt,
});

export const toDeckCard = (row: DeckCardRow): DeckCard => ({
  oracleId: row.oracle_id,
  quantity: row.quantity,
  category: row.category,
  isCommander: row.is_commander,
});

export const fromDeckCard = (deckId: string, card: DeckCard): DeckCardRow => ({
  deck_id: deckId,
  oracle_id: card.oracleId,
  quantity: card.quantity,
  category: card.category,
  is_commander: card.isCommander,
});

export const toDeck = (row: DeckRow): Deck => ({
  id: row.id,
  ownerId: row.owner_id,
  name: row.name,
  commanderOracleId: row.commander_oracle_id,
  partnerOracleId: row.partner_oracle_id,
  theme: row.theme ?? '',
  bracket: Math.min(5, Math.max(1, row.bracket)) as Bracket,
  createdAt: row.created_at,
  cards: (row.deck_cards ?? []).map(toDeckCard),
});

export const toLoan = (row: LoanRequestRow): LoanRequest => ({
  id: row.id,
  cardOracleId: row.card_oracle_id,
  requesterId: row.requester_id,
  ownerId: row.owner_id,
  status: row.status as LoanStatus,
  note: row.note,
  createdAt: row.created_at,
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
  winnerCommanderOracleId: row.winner_commander_oracle_id,
  playerCount: row.player_count,
  durationMinutes: row.duration_minutes,
});
