import type {
  Bracket,
  Card,
  CollectionItem,
  CollectionItemKey,
  Deck,
  DeckCard,
  Game,
  GameNight,
  LoanRequest,
  LoanStatus,
  Playgroup,
  Profile,
  Rsvp,
} from '@/types';

/**
 * Repository contracts. Stores talk to these; implementations talk to services.
 * Each has a mock (seed data, the default) and a Supabase implementation — `getRepos()`
 * picks one from EXPO_PUBLIC_DATA_MODE.
 */

export interface SessionRepo {
  /** The signed-in user's profile, or null when signed out. */
  currentUser(): Promise<Profile | null>;
  /** Email + password. Throws on wrong credentials. */
  signIn(email: string, password: string): Promise<Profile | null>;
  /** New account, signed in straight away (no confirmation email). The DB trigger creates the profile. */
  signUp(email: string, password: string, displayName: string): Promise<Profile | null>;
  /** Email a 6-digit password-reset code. */
  requestPasswordReset(email: string): Promise<void>;
  /** Check the emailed code, set the new password and sign in. */
  resetPassword(email: string, code: string, newPassword: string): Promise<Profile | null>;
  /** Called with the user id whenever the auth session changes (null = signed out). Returns unsubscribe. */
  onAuthChange(listener: (userId: string | null) => void): () => void;
  signOut(): Promise<void>;
}

export interface CardRepo {
  /** Cards by version id. */
  getByIds(ids: string[]): Promise<Card[]>;
  /** One representative printing per card id. */
  getByCardIds(cardIds: string[]): Promise<Card[]>;
  /** Exact (or fuzzy) name lookup; null when Scryfall has no match. */
  findByName(name: string, options?: { fuzzy?: boolean }): Promise<Card | null>;
  autocomplete(query: string): Promise<string[]>;
  getPrintings(cardId: string): Promise<Card[]>;
  /** Remember cards (Supabase: upsert into the shared `cards` cache table). */
  save(cards: Card[]): Promise<void>;
}

export interface CollectionRepo {
  list(userId: string): Promise<CollectionItem[]>;
  /** Inserts the row, or replaces the one with the same user, version and finish. */
  upsert(item: CollectionItem): Promise<CollectionItem>;
  remove(key: CollectionItemKey): Promise<void>;
}

export interface NewDeck {
  ownerId: string;
  name: string;
  commanderCardId: string;
  theme: string;
  bracket: Bracket;
  cards: DeckCard[];
}

export interface DeckRepo {
  list(ownerId: string): Promise<Deck[]>;
  create(deck: NewDeck): Promise<Deck>;
  upsertCard(deckId: string, card: DeckCard): Promise<void>;
  removeCard(deckId: string, cardId: string): Promise<void>;
}

/** Everything the Group tab needs, loaded in one go. */
export interface PlaygroupSnapshot {
  playgroup: Playgroup;
  members: Profile[];
  nextGameNight: GameNight | null;
  rsvps: Rsvp[];
  games: Game[];
  loans: LoanRequest[];
  /** Other members' collection items — powers "Who has it?" and "Jonas has it" pills. */
  memberItems: CollectionItem[];
}

export interface PlaygroupRepo {
  /** The user's playgroup (the first one, for now), or null if they're not in one. */
  load(userId: string): Promise<PlaygroupSnapshot | null>;
  setRsvp(rsvp: Rsvp): Promise<void>;
  updateLoan(loanId: string, status: LoanStatus): Promise<void>;
  requestLoan(request: Pick<LoanRequest, 'cardId' | 'requesterId' | 'ownerId' | 'note'>): Promise<LoanRequest>;
  logGame(game: Omit<Game, 'id'>): Promise<Game>;
}

export interface Repos {
  session: SessionRepo;
  cards: CardRepo;
  collection: CollectionRepo;
  decks: DeckRepo;
  playgroup: PlaygroupRepo;
}
