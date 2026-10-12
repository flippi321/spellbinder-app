import type { OracleAnswer, OracleSuggestion, OracleSuggestionId } from '@/types';

/** The three preview prompts (VISION §4). */
export const ORACLE_SUGGESTIONS: readonly OracleSuggestion[] = [
  { id: 'atraxa', question: 'Do you have any improvements on my Atraxa deck?' },
  { id: 'commanders', question: 'Given my cards, do you have any cool commanders?' },
  { id: 'combos', question: 'Are there any combos hiding in my collection?' },
];

/** Canned answers for the preview — written against the mock seed data. */
export const ORACLE_ANSWERS: Record<OracleSuggestionId, OracleAnswer> = {
  atraxa: {
    intro:
      'Atraxa is in good shape — you own 94% of it, and two of the six missing cards are sitting in friends’ binders. Two things stand out.',
    sections: [
      {
        title: 'Ramp is a little thin',
        paragraphs: [
          'You’re running 8 ramp pieces. For a four-color deck with a four-mana commander, about 10 is safer, so Atraxa lands on turn three more often.',
          'You already own two easy additions. Thrummingbird and Fertilid are the simplest cuts to make room.',
        ],
        chips: [
          { name: 'Fellwar Stone', note: 'Spare in your binder', tone: 'neutral' },
          { name: 'Rampant Growth', note: 'Spare in your binder', tone: 'neutral' },
        ],
      },
      {
        title: 'Some cards ignore Atraxa',
        paragraphs: [
          'Mystic Remora draws cards, but it does nothing with counters and taxes you every upkeep.',
          'Inspiring Call keeps the card draw and rewards the counters you’re already putting out. Karn’s Bastion would add a proliferate from your land slot.',
        ],
        chips: [
          { name: 'Inspiring Call', note: 'Spare in your binder', tone: 'neutral' },
          { name: "Karn's Bastion", note: 'Sanna has one', tone: 'friend' },
        ],
      },
    ],
    action: {
      kind: 'applySwaps',
      label: 'Apply these swaps',
      deckName: "Atraxa, Praetors' Voice",
      remove: ['Mystic Remora', 'Thrummingbird', 'Fertilid'],
      add: [
        { name: 'Inspiring Call', category: 'Card draw' },
        { name: 'Fellwar Stone', category: 'Ramp' },
        { name: 'Rampant Growth', category: 'Ramp' },
      ],
    },
  },
  commanders: {
    intro:
      'Your binder hides a mill theme — 41 cards that mill or reward milling, and most of them aren’t in a deck. One commander ties them together.',
    featured: {
      name: 'The Wise Mothman',
      colors: ['U', 'B', 'G'],
      typeLine: 'Legendary Creature — Mutant Insect',
      stats: '3/3 · Flying',
      note: 'In your binder · in no deck',
    },
    sections: [
      {
        title: 'Why it works',
        paragraphs: [
          'Whenever nonland cards are milled — by any player — the Mothman spreads +1/+1 counters across your creatures.',
          'Its rad counters make the whole table mill every turn, so it feeds itself.',
        ],
      },
      {
        title: 'Builds on what you love',
        paragraphs: [
          'Same colors as Muldrotha, and it reuses the counter cards that make Atraxa tick.',
        ],
        chips: [
          { name: "Stitcher's Supplier", note: 'Spare in your binder', tone: 'neutral' },
          { name: 'Ruin Crab', note: 'Spare in your binder', tone: 'neutral' },
          { name: 'Hardened Scales', note: 'In Atraxa', tone: 'neutral' },
          { name: 'Winding Constrictor', note: 'Jonas has one', tone: 'friend' },
        ],
      },
    ],
    action: { kind: 'createDeck', label: 'Start a Mothman deck', commanderName: 'The Wise Mothman' },
  },
  combos: {
    intro: 'One real combo is a single borrow away, and there’s an engine worth knowing about.',
    sections: [
      {
        title: 'Exquisite Blood + Sanguine Bond',
        paragraphs: [
          'Together they’re an infinite drain: every point of life you gain makes an opponent lose life, which you gain back, and so on until the table is out.',
          'You own Exquisite Blood — it’s already in Edgar. Mira has Sanguine Bond.',
        ],
        chips: [
          { name: 'Exquisite Blood', note: 'In Edgar', tone: 'neutral' },
          { name: 'Sanguine Bond', note: 'Mira has one', tone: 'friend' },
        ],
      },
      {
        title: 'Skullclamp in Krenko',
        paragraphs: [
          'Skullclamp is a spare in your binder. With Krenko’s 1/1 goblins it draws two cards for every mana you spend — very strong, so check the table is comfortable with it at Bracket 2.',
        ],
        chips: [{ name: 'Skullclamp', note: 'Spare in your binder', tone: 'neutral' }],
      },
    ],
    action: { kind: 'requestLoan', label: 'Ask Mira for Sanguine Bond', cardName: 'Sanguine Bond', ownerName: 'Mira' },
  },
};

/** Home "At a glance" teasers that open the Oracle on a suggestion. */
export const ORACLE_TEASERS = {
  combo: { value: '1', label: 'card from a combo in Edgar', ask: 'combos' },
  commander: { label: 'A commander hides in your binder', ask: 'commanders' },
} as const satisfies Record<string, { value?: string; label: string; ask: OracleSuggestionId }>;

export const ORACLE_FALLBACK: OracleAnswer = {
  intro:
    'In this preview I can only answer the suggested questions. Tap one of the prompts above the message box to see what the Oracle will do once it’s connected to your binders.',
  sections: [],
};

/** Matches a question to a canned answer (exact suggestion text, case-insensitive). */
export function cannedAnswerFor(question: string): OracleAnswer {
  const normalized = question.trim().toLowerCase();
  const suggestion = ORACLE_SUGGESTIONS.find((s) => s.question.toLowerCase() === normalized);
  return suggestion ? ORACLE_ANSWERS[suggestion.id] : ORACLE_FALLBACK;
}
