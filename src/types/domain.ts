import type { AvatarColor } from '@/theme/colors';

import type { ScryfallCard } from './scryfall';

/** A cached Scryfall card (one printing). The local twin of the `cards` table. */
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

export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';

/** One stack of physical copies. Stored by Scryfall printing id; `oracleId` powers "Do I own this?". */
export interface CollectionItem {
  id: string;
  userId: string;
  scryfallId: string;
  oracleId: string;
  quantity: number;
  foil: boolean;
  condition: CardCondition;
  createdAt: string;
}

/** Free-form so users can invent categories; see utils/category.ts for the common ones. */
export type DeckCategory = string;

/** A deck slot. Stored by oracle id so any printing you own counts. */
export interface DeckCard {
  oracleId: string;
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
  commanderOracleId: string;
  partnerOracleId: string | null;
  theme: string;
  bracket: Bracket;
  createdAt: string;
  cards: DeckCard[];
}

export type LoanStatus = 'pending' | 'lent' | 'declined' | 'returned';

export interface LoanRequest {
  id: string;
  cardOracleId: string;
  requesterId: string;
  ownerId: string;
  status: LoanStatus;
  note: string | null;
  createdAt: string;
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
  winnerCommanderOracleId: string | null;
  playerCount: number;
  durationMinutes: number | null;
}

/** Ownership of one deck slot from your point of view. */
export type OwnershipStatus =
  | { kind: 'owned' }
  | { kind: 'friend'; ownerIds: string[] }
  | { kind: 'missing' };

export type DataMode = 'mock' | 'supabase';
