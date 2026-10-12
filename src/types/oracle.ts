import type { ManaColor } from '@/theme/colors';

/** A card mentioned in an Oracle answer, e.g. "Rampant Growth — Spare in your binder". */
export interface OracleCardChip {
  name: string;
  note: string;
  /** `friend` renders blue ("Jonas has one"); `neutral` renders grey. */
  tone: 'neutral' | 'friend';
}

export interface OracleSection {
  title: string;
  paragraphs: string[];
  chips?: OracleCardChip[];
}

export interface OracleFeaturedCard {
  name: string;
  colors: ManaColor[];
  typeLine: string;
  stats?: string;
  note: string;
}

/** What the gold primary button under an answer does. */
export type OracleAction =
  | {
      kind: 'applySwaps';
      label: string;
      deckName: string;
      remove: string[];
      add: { name: string; category: string }[];
    }
  | { kind: 'createDeck'; label: string; commanderName: string }
  | { kind: 'requestLoan'; label: string; cardName: string; ownerName: string };

export interface OracleAnswer {
  intro: string;
  featured?: OracleFeaturedCard;
  sections: OracleSection[];
  action?: OracleAction;
}

export type OracleMessage =
  | { id: string; role: 'user'; text: string; createdAt: string }
  | { id: string; role: 'oracle'; answer: OracleAnswer; createdAt: string };

export type OracleSuggestionId = 'atraxa' | 'commanders' | 'combos';

export interface OracleSuggestion {
  id: OracleSuggestionId;
  question: string;
}

/** Structured context the real Oracle (Edge Function) will receive. */
export interface OracleContext {
  userId: string;
  deckIds: string[];
}
