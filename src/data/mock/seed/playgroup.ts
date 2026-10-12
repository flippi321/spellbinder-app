import type { GameNight, LoanStatus, Playgroup, PlaygroupMember, Profile, Rsvp } from '@/types';

import type { SeedCopy } from './binder';

export const ME = 'user-you';
export const JONAS = 'user-jonas';
export const MIRA = 'user-mira';
export const ERIK = 'user-erik';
export const SANNA = 'user-sanna';

export const PROFILES: Profile[] = [
  { id: ME, displayName: 'You', initials: 'YO', avatarColor: 'gold' },
  { id: JONAS, displayName: 'Jonas', initials: 'JO', avatarColor: 'blue' },
  { id: MIRA, displayName: 'Mira', initials: 'MI', avatarColor: 'violet' },
  { id: ERIK, displayName: 'Erik', initials: 'ER', avatarColor: 'green' },
  { id: SANNA, displayName: 'Sanna', initials: 'SA', avatarColor: 'red' },
];

export const PLAYGROUP: Playgroup = {
  id: 'pg-thursday',
  name: 'The Thursday Table',
  inviteCode: 'THURS-7Q2K',
  createdBy: JONAS,
};

export const MEMBERS: PlaygroupMember[] = PROFILES.map((profile) => ({
  playgroupId: PLAYGROUP.id,
  userId: profile.id,
  role: profile.id === JONAS ? 'owner' : 'member',
}));

/**
 * What your friends own. Kept clear of your decks' missing cards except the three
 * friend-owned ones (see NOT_OWNED in binder.ts).
 */
export const FRIEND_COLLECTIONS: Record<string, SeedCopy[]> = {
  [JONAS]: [
    { name: 'Smothering Tithe', qty: 1 },
    { name: 'Winding Constrictor', qty: 1 },
    { name: 'The Wise Mothman', qty: 1 },
    { name: 'Sol Ring', qty: 1 },
    { name: 'Arcane Signet', qty: 2 },
    { name: 'Command Tower', qty: 2 },
    { name: 'Lightning Bolt', qty: 2 },
    { name: 'Swords to Plowshares', qty: 1 },
    { name: 'Esper Sentinel', qty: 1 },
    { name: 'Demonic Tutor', qty: 1 },
    { name: 'Counterspell', qty: 2 },
    { name: 'Llanowar Elves', qty: 3 },
  ],
  [MIRA]: [
    { name: 'Sanguine Bond', qty: 1 },
    { name: 'The Wise Mothman', qty: 1, foil: 1 },
    { name: 'Blood Artist', qty: 1 },
    { name: 'Zulaport Cutthroat', qty: 2 },
    { name: 'Sol Ring', qty: 1 },
    { name: 'Counterspell', qty: 1 },
    { name: 'Path to Exile', qty: 1 },
    { name: 'Anguished Unmaking', qty: 1 },
    { name: 'Skullclamp', qty: 1 },
    { name: 'Cultivate', qty: 2 },
  ],
  [ERIK]: [
    { name: 'Doubling Season', qty: 1 },
    { name: 'Cyclonic Rift', qty: 1 },
    { name: 'The Wise Mothman', qty: 1 },
    { name: 'Command Tower', qty: 1 },
    { name: 'Cultivate', qty: 1 },
    { name: 'Rampant Growth', qty: 2 },
    { name: 'Eternal Witness', qty: 1 },
    { name: 'Craterhoof Behemoth', qty: 1 },
    { name: 'Sol Ring', qty: 1 },
  ],
  [SANNA]: [
    { name: "Karn's Bastion", qty: 1 },
    { name: 'Sol Ring', qty: 1 },
    { name: 'Arcane Signet', qty: 1 },
    { name: 'Inspiring Call', qty: 1 },
    { name: 'Hardened Scales', qty: 1 },
    { name: 'Fellwar Stone', qty: 1 },
    { name: 'Swords to Plowshares', qty: 1 },
  ],
};

/** Next Thursday at 19:00 local time (today counts if it's still before 19:00). */
export function nextThursdayAt19(now: Date = new Date()): Date {
  const date = new Date(now);
  date.setHours(19, 0, 0, 0);
  date.setDate(date.getDate() + ((4 - date.getDay() + 7) % 7));
  if (date.getTime() <= now.getTime()) date.setDate(date.getDate() + 7);
  return date;
}

export const GAME_NIGHT_ID = 'gn-next';

export function seedGameNight(now: Date = new Date()): GameNight {
  return {
    id: GAME_NIGHT_ID,
    playgroupId: PLAYGROUP.id,
    startsAt: nextThursdayAt19(now).toISOString(),
    location: "Jonas's",
    notes: 'Bracket 2–3 decks. Pizza at 18:30.',
  };
}

/** 4 of 5 going. */
export const SEED_RSVPS: Rsvp[] = [
  { gameNightId: GAME_NIGHT_ID, userId: ME, status: 'going' },
  { gameNightId: GAME_NIGHT_ID, userId: JONAS, status: 'going' },
  { gameNightId: GAME_NIGHT_ID, userId: MIRA, status: 'going' },
  { gameNightId: GAME_NIGHT_ID, userId: ERIK, status: 'going' },
  { gameNightId: GAME_NIGHT_ID, userId: SANNA, status: 'maybe' },
];

/** Winners of this season's 21 games, oldest first: Mira 7, Jonas 5, You 4, Erik 3, Sanna 2. */
export const SEASON_WINNERS: string[] = [
  MIRA, JONAS, ME, MIRA, ERIK, JONAS, MIRA, SANNA, ME, MIRA, JONAS,
  ERIK, MIRA, ME, JONAS, SANNA, MIRA, ERIK, JONAS, ME, MIRA,
];

export interface SeedLoan {
  id: string;
  cardName: string;
  requesterId: string;
  ownerId: string;
  status: LoanStatus;
  note: string | null;
  createdAt: string;
}

export const SEED_LOANS: SeedLoan[] = [
  {
    id: 'loan-rift',
    cardName: 'Cyclonic Rift',
    requesterId: ME,
    ownerId: ERIK,
    status: 'lent',
    note: 'For Muldrotha until the next game night',
    createdAt: '2026-09-24T18:00:00.000Z',
  },
  {
    id: 'loan-greaves',
    cardName: 'Lightning Greaves',
    requesterId: MIRA,
    ownerId: ME,
    status: 'lent',
    note: null,
    createdAt: '2026-09-17T19:30:00.000Z',
  },
  {
    id: 'loan-rhystic',
    cardName: 'Rhystic Study',
    requesterId: JONAS,
    ownerId: ME,
    status: 'pending',
    note: 'Want to try it in my Kenrith deck on Thursday',
    createdAt: '2026-10-11T09:12:00.000Z',
  },
];
