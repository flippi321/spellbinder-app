import type { AvatarColor } from '@/theme/colors';

import type { ScryfallCard } from './scryfall';

/**
 * A cached Scryfall card: one version (printing) plus its card's rules. In Supabase it's a `card_versions` row joined
 * to its `cards` row. `card.id` is the version id; `getCardId(card)` is the card id (Scryfall's oracle_id).
 */
export type Card = ScryfallCard;

export interface Profile {
  id: string;
  displayName: string;
  initials: string;
  avatarColor: AvatarColor;
}

export interface Playgroup {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
}

export type PlaygroupRole = 'owner' | 'member';

export interface PlaygroupMember {
  playgroupId: string;
  userId: string;
  role: PlaygroupRole;
}

/** Cardmarket's grading scale, best first; labels in utils/collection.ts. New copies are Near Mint. */
export type CardCondition = 'M' | 'NM' | 'EX' | 'GD' | 'LP' | 'PL' | 'PO';

/** How a copy is printed. Matches Scryfall's `finishes`. */
export type CardFinish = 'nonfoil' | 'foil' | 'etched';

/**
 * Your copies of one version in one finish: one row per (userId, versionId, finish), so `quantity` is the whole count.
 * `cardId` powers "Do I own this?" across versions.
 */
export interface CollectionItem {
  userId: string;
  versionId: string;
  cardId: string;
  quantity: number;
  finish: CardFinish;
  condition: CardCondition;
  createdAt: string;
  updatedAt?: string;
}

/** What identifies a collection row (the table's primary key). */
export type CollectionItemKey = Pick<CollectionItem, 'userId' | 'versionId' | 'finish'>;

/** Free-form so users can invent categories; see utils/category.ts for the common ones. */
export type DeckCategory = string;

/** A deck slot. Stored by card id so any version you own counts. */
export interface DeckCard {
  cardId: string;
  quantity: number;
  category: DeckCategory;
  isCommander: boolean;
}

/** Commander Brackets (1 = exhibition … 5 = cEDH). */
export type Bracket = 1 | 2 | 3 | 4 | 5;

export interface Deck {
  id: string;
  ownerId: string;
  name: string;
  commanderCardId: string;
  partnerCardId: string | null;
  theme: string;
  bracket: Bracket;
  createdAt: string;
  updatedAt?: string;
  cards: DeckCard[];
}

export type LoanStatus = 'pending' | 'lent' | 'declined' | 'returned';

export interface LoanRequest {
  id: string;
  cardId: string;
  requesterId: string;
  ownerId: string;
  status: LoanStatus;
  note: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface GameNight {
  id: string;
  playgroupId: string;
  startsAt: string;
  location: string;
  notes: string | null;
}

export type RsvpStatus = 'going' | 'maybe' | 'no';

export interface Rsvp {
  gameNightId: string;
  userId: string;
  status: RsvpStatus;
}

export interface Game {
  id: string;
  playgroupId: string;
  playedAt: string;
  winnerId: string;
  winnerCommanderCardId: string | null;
  /** The game night it was played at; null for games outside one. */
  gameNightId: string | null;
  playerCount: number;
  durationMinutes: number | null;
}

/** Ownership of one deck slot from your point of view. */
export type OwnershipStatus =
  | { kind: 'owned' }
  | { kind: 'friend'; ownerIds: string[] }
  | { kind: 'missing' };

export type DataMode = 'mock' | 'supabase';
