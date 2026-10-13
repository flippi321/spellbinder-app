import {
  fromCard,
  fromCollectionItem,
  fromDeckCard,
  fromRsvp,
  toCard,
  toCollectionItem,
  toDeck,
  toDeckCard,
  toGame,
  toGameNight,
  toLoan,
  toPlaygroup,
  toProfile,
  toRsvp,
  fromJson,
  type CardFaceRow,
  type CardRow,
  type CardVersionRow,
  type CardVersionWithCardRow,
  type CollectionItemRow,
  type DeckCardRow,
  type DeckWithCardsRow,
  type GameNightRow,
  type GameRow,
  type LoanRequestRow,
} from '@/data/supabase/mappers';
import type { CardCondition, CardFinish, LoanStatus } from '@/types';
import type { ScryfallCard } from '@/types/scryfall';

const CONDITIONS = Object.keys({
  M: true, NM: true, EX: true, GD: true, LP: true, PL: true, PO: true,
} satisfies Record<CardCondition, true>) as CardCondition[];
const FINISHES = Object.keys({ nonfoil: true, foil: true, etched: true } satisfies Record<CardFinish, true>) as CardFinish[];
const LOAN_STATUSES = Object.keys({
  pending: true, lent: true, declined: true, returned: true,
} satisfies Record<LoanStatus, true>) as LoanStatus[];

const STAMP = '2026-10-01T00:00:00.000Z';

const solRing: ScryfallCard = {
  id: 'v-sol',
  oracle_id: 'c-sol',
  name: 'Sol Ring',
  layout: 'normal',
  mana_cost: '{1}',
  cmc: 1,
  type_line: 'Artifact',
  oracle_text: '{T}: Add {C}{C}.',
  colors: [],
  color_identity: [],
  legalities: { commander: 'legal' },
  image_uris: { normal: 'https://img/sol.jpg' },
  set: 'cmm',
  collector_number: '1',
  rarity: 'uncommon',
  artist: 'Mark Tedin',
  finishes: ['nonfoil', 'foil'],
};

const delver: ScryfallCard = {
  id: 'v-delver',
  oracle_id: 'c-delver',
  name: 'Delver of Secrets // Insectile Aberration',
  layout: 'transform',
  cmc: 1,
  type_line: 'Creature — Human Wizard // Creature — Human Insect',
  color_identity: ['U'],
  legalities: { commander: 'legal' },
  card_faces: [
    {
      name: 'Delver of Secrets',
      mana_cost: '{U}',
      type_line: 'Creature — Human Wizard',
      oracle_text: 'At the beginning of your upkeep, look at the top card of your library.',
      colors: ['U'],
      power: '1',
      toughness: '1',
      artist: 'Matt Stewart',
      image_uris: { normal: 'https://img/delver-front.jpg' },
    },
    {
      name: 'Insectile Aberration',
      type_line: 'Creature — Human Insect',
      oracle_text: 'Flying',
      colors: ['U'],
      power: '3',
      toughness: '2',
      artist: 'Matt Stewart',
      image_uris: { normal: 'https://img/delver-back.jpg' },
    },
  ],
  set: 'isd',
  collector_number: '51',
  rarity: 'common',
  finishes: ['nonfoil'],
};

/**
 * What a `card_versions` select with `card:cards(*)` returns for a card written by `fromCard`. `fromCard` fills every
 * column, so its insert rows are complete rows.
 */
const asRow = (scryfall: ScryfallCard): CardVersionWithCardRow => {
  const { card, version } = fromCard(scryfall, scryfall.oracle_id!);
  return { ...(version as CardVersionRow), card: card as CardRow };
};

describe('fromCard', () => {
  it('splits a card into its rules (cards) and this printing (card_versions)', () => {
    const { card, version } = fromCard(solRing, 'c-sol');
    expect(card).toMatchObject({
      id: 'c-sol',
      name: 'Sol Ring',
      mana_cost: '{1}',
      type_line: 'Artifact',
      rules_text: '{T}: Add {C}{C}.',
      card_faces: null,
    });
    expect(card).not.toHaveProperty('oracle_text');
    expect(version).toMatchObject({
      id: 'v-sol',
      card_id: 'c-sol',
      set: 'cmm',
      collector_number: '1',
      artist: 'Mark Tedin',
      image_uris: { normal: 'https://img/sol.jpg' },
      card_faces: null,
      finishes: ['nonfoil', 'foil'],
    });
  });

  it('puts each face\'s rules on the card and its images and artist on the version', () => {
    const { card, version } = fromCard(delver, 'c-delver');
    expect(card.card_faces).toEqual([
      expect.objectContaining({ name: 'Delver of Secrets', mana_cost: '{U}', rules_text: expect.stringContaining('upkeep') }),
      expect.objectContaining({ name: 'Insectile Aberration', rules_text: 'Flying', power: '3' }),
    ]);
    expect(fromJson<CardFaceRow[]>(card.card_faces!)[0]).not.toHaveProperty('image_uris');
    expect(version.card_faces).toEqual([
      { artist: 'Matt Stewart', image_uris: { normal: 'https://img/delver-front.jpg' } },
      { artist: 'Matt Stewart', image_uris: { normal: 'https://img/delver-back.jpg' } },
    ]);
  });

  it('uses the given card id (reversible cards carry it only on their faces)', () => {
    const { card, version } = fromCard({ ...solRing, oracle_id: undefined }, 'from-face');
    expect(card.id).toBe('from-face');
    expect(version.card_id).toBe('from-face');
  });

  it.each([
    ['unknown finishes', ['nonfoil', 'glossy'], ['nonfoil']],
    ['etched only', ['etched'], ['etched']],
    ['no finishes', [], ['nonfoil']],
    ['missing finishes', undefined, ['nonfoil']],
  ])('keeps only real finishes: %s', (_, finishes, expected) => {
    expect(fromCard({ ...solRing, finishes }, 'c-sol').version.finishes).toEqual(expected);
  });

  it('writes null for missing optional fields', () => {
    const { card, version } = fromCard(
      { ...solRing, mana_cost: undefined, oracle_text: undefined, colors: undefined, image_uris: undefined, artist: undefined },
      'c-sol',
    );
    expect(card).toMatchObject({ mana_cost: null, rules_text: null, colors: null, power: null, toughness: null, loyalty: null });
    expect(version).toMatchObject({ image_uris: null, artist: null });
  });
});

describe('toCard', () => {
  it.each([
    ['a single-faced card', solRing],
    ['a double-faced card', delver],
  ])('joins a version and its card back into the same Scryfall card: %s', (_, scryfall) => {
    expect(toCard(asRow(scryfall))).toEqual(scryfall);
  });

  it('maps null columns to absent fields', () => {
    const row = asRow({ ...solRing, mana_cost: undefined, oracle_text: undefined, image_uris: undefined, artist: undefined });
    const card = toCard(row);
    expect(card.mana_cost).toBeUndefined();
    expect(card.oracle_text).toBeUndefined();
    expect(card.image_uris).toBeUndefined();
    expect(card.artist).toBeUndefined();
  });

  it('tolerates a version without per-face rows', () => {
    const row = asRow(delver);
    const card = toCard({ ...row, card_faces: null });
    expect(card.card_faces?.map((face) => face.name)).toEqual(['Delver of Secrets', 'Insectile Aberration']);
    expect(card.card_faces?.[0].image_uris).toBeUndefined();
  });
});

const itemRow: CollectionItemRow = {
  id: 'ci-1',
  user_id: 'me',
  version_id: 'v-sol',
  card_id: 'c-sol',
  quantity: 2,
  finish: 'nonfoil',
  condition: 'NM',
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-02T00:00:00.000Z',
};

describe('collection items', () => {
  it('maps a row to the domain', () => {
    expect(toCollectionItem(itemRow)).toEqual({
      id: 'ci-1',
      userId: 'me',
      versionId: 'v-sol',
      cardId: 'c-sol',
      quantity: 2,
      finish: 'nonfoil',
      condition: 'NM',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-02T00:00:00.000Z',
    });
  });

  it('leaves updated_at out of writes so the database stamps it', () => {
    expect(fromCollectionItem(toCollectionItem(itemRow))).not.toHaveProperty('updated_at');
  });

  it.each(FINISHES)('round-trips finish %s', (finish) => {
    expect(fromCollectionItem(toCollectionItem({ ...itemRow, finish })).finish).toBe(finish);
  });

  it.each(CONDITIONS)('round-trips condition %s', (condition) => {
    expect(fromCollectionItem(toCollectionItem({ ...itemRow, condition })).condition).toBe(condition);
  });
});

describe('decks', () => {
  const deckRow: DeckWithCardsRow = {
    id: 'd1',
    owner_id: 'me',
    name: 'Atraxa',
    commander_card_id: 'c-atraxa',
    partner_card_id: null,
    theme: null,
    bracket: 3,
    created_at: STAMP,
    updated_at: STAMP,
    deck_cards: [{ deck_id: 'd1', card_id: 'c-sol', quantity: 1, category: 'Ramp', is_commander: false }],
  };

  it('maps card ids, a missing partner and missing theme', () => {
    expect(toDeck(deckRow)).toMatchObject({
      commanderCardId: 'c-atraxa',
      partnerCardId: null,
      theme: '',
      updatedAt: STAMP,
      cards: [{ cardId: 'c-sol', quantity: 1, category: 'Ramp', isCommander: false }],
    });
  });

  it('maps a partner and updated_at', () => {
    expect(toDeck({ ...deckRow, partner_card_id: 'c-partner', updated_at: '2026-10-03T00:00:00.000Z' })).toMatchObject({
      partnerCardId: 'c-partner',
      updatedAt: '2026-10-03T00:00:00.000Z',
    });
  });

  it('reads a deck without embedded cards as empty', () => {
    expect(toDeck({ ...deckRow, deck_cards: undefined }).cards).toEqual([]);
  });

  it.each([
    [0, 1],
    [1, 1],
    [5, 5],
    [9, 5],
  ])('clamps bracket %i to %i', (bracket, expected) => {
    expect(toDeck({ ...deckRow, bracket }).bracket).toBe(expected);
  });

  it('round-trips a deck card by card id', () => {
    const card = { cardId: 'c-sol', quantity: 1, category: 'Ramp', isCommander: true };
    expect(fromDeckCard('d1', card)).toEqual({ deck_id: 'd1', card_id: 'c-sol', quantity: 1, category: 'Ramp', is_commander: true });
    const row: DeckCardRow = { deck_id: 'd1', card_id: 'c-sol', quantity: 1, category: 'Ramp', is_commander: true };
    expect(toDeckCard(row)).toEqual(card);
  });
});

describe('loans', () => {
  const loanRow: LoanRequestRow = {
    id: 'l1',
    card_id: 'c-rift',
    requester_id: 'me',
    owner_id: 'erik',
    status: 'pending',
    note: null,
    created_at: STAMP,
    updated_at: STAMP,
  };

  it.each(LOAN_STATUSES)('maps a %s loan by card id', (status) => {
    expect(toLoan({ ...loanRow, status })).toMatchObject({ cardId: 'c-rift', status, updatedAt: STAMP });
  });
});

describe('games', () => {
  const gameRow: GameRow = {
    id: 'g1',
    playgroup_id: 'pg',
    played_at: '2026-10-01T19:30:00.000Z',
    winner_id: 'mira',
    winner_commander_card_id: null,
    game_night_id: null,
    player_count: 4,
    duration_minutes: null,
    created_by: 'mira',
    created_at: STAMP,
    updated_at: STAMP,
  };

  it('maps a game outside any game night', () => {
    expect(toGame(gameRow)).toMatchObject({ winnerCommanderCardId: null, gameNightId: null });
  });

  it('maps a game played at a game night with the winning commander', () => {
    expect(toGame({ ...gameRow, game_night_id: 'gn1', winner_commander_card_id: 'c-krenko' })).toMatchObject({
      gameNightId: 'gn1',
      winnerCommanderCardId: 'c-krenko',
    });
  });
});

describe('profiles, playgroups, game nights and RSVPs', () => {
  it('maps a profile and falls back to gold for an unknown avatar color', () => {
    const row = { id: 'me', display_name: 'You', initials: 'YO', avatar_color: 'blue', created_at: STAMP, updated_at: STAMP };
    expect(toProfile(row)).toEqual({ id: 'me', displayName: 'You', initials: 'YO', avatarColor: 'blue' });
    expect(toProfile({ ...row, avatar_color: 'plaid' }).avatarColor).toBe('gold');
  });

  it('maps a playgroup', () => {
    const row = { id: 'pg', name: 'The Thursday Table', invite_code: 'THURS7Q2', created_by: 'jonas', created_at: STAMP, updated_at: STAMP };
    expect(toPlaygroup(row)).toEqual({
      id: 'pg',
      name: 'The Thursday Table',
      inviteCode: 'THURS7Q2',
      createdBy: 'jonas',
    });
  });

  it('maps a game night with and without a location', () => {
    const row: GameNightRow = {
      id: 'gn1',
      playgroup_id: 'pg',
      starts_at: '2026-10-15T17:00:00.000Z',
      location: null,
      notes: null,
      created_by: 'jonas',
      created_at: STAMP,
      updated_at: STAMP,
    };
    expect(toGameNight(row)).toEqual({ id: 'gn1', playgroupId: 'pg', startsAt: row.starts_at, location: '', notes: null });
    expect(toGameNight({ ...row, location: "Jonas's" }).location).toBe("Jonas's");
  });

  it.each(['going', 'maybe', 'no'] as const)('maps a %s RSVP both ways', (status) => {
    const rsvp = { gameNightId: 'gn1', userId: 'me', status };
    expect(fromRsvp(rsvp)).toEqual({ game_night_id: 'gn1', user_id: 'me', status });
    expect(toRsvp({ game_night_id: 'gn1', user_id: 'me', status, updated_at: STAMP })).toEqual(rsvp);
  });
});

describe('fromJson', () => {
  it('reads a jsonb value as the shape the write mappers stored', () => {
    const faces = fromJson<CardFaceRow[]>([{ name: 'Delver of Secrets', rules_text: 'Flying' }]);
    expect(faces[0].rules_text).toBe('Flying');
  });
});
