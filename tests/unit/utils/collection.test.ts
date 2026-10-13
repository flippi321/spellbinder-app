import type { Card, CardCondition, CardFinish } from '@/types';
import { Constants } from '@/types/database';
import {
  CARD_CONDITIONS,
  CONDITION_LABELS,
  DEFAULT_CONDITION,
  finishFor,
  isFoil,
  migrateCollectionItem,
} from '@/utils/collection';

const CONDITIONS = Object.keys({
  M: true, NM: true, EX: true, GD: true, LP: true, PL: true, PO: true,
} satisfies Record<CardCondition, true>) as CardCondition[];

const card = (finishes?: string[]): Card => ({
  id: 'v1',
  oracle_id: 'c1',
  name: 'Sol Ring',
  layout: 'normal',
  cmc: 1,
  type_line: 'Artifact',
  color_identity: [],
  legalities: {},
  set: 'cmm',
  collector_number: '1',
  rarity: 'uncommon',
  finishes,
});

describe('conditions', () => {
  it('lists every condition, best first', () => {
    expect(CARD_CONDITIONS).toEqual(['M', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO']);
    expect([...CARD_CONDITIONS].sort()).toEqual([...CONDITIONS].sort());
  });

  it.each([
    ['M', 'Mint'],
    ['NM', 'Near Mint'],
    ['EX', 'Excellent'],
    ['GD', 'Good'],
    ['LP', 'Light Played'],
    ['PL', 'Played'],
    ['PO', 'Poor'],
  ] as const)('labels %s as %s', (condition, label) => {
    expect(CONDITION_LABELS[condition]).toBe(label);
  });

  it('starts new copies Near Mint', () => {
    expect(DEFAULT_CONDITION).toBe('NM');
  });
});

describe('isFoil', () => {
  it.each([
    ['nonfoil', false],
    ['foil', true],
    ['etched', true],
  ] as [CardFinish, boolean][])('%s → %s', (finish, expected) => {
    expect(isFoil({ finish })).toBe(expected);
  });
});

describe('finishFor', () => {
  it('is nonfoil when the foil toggle is off, whatever the version offers', () => {
    expect(finishFor(card(['etched']), false)).toBe('nonfoil');
  });

  it.each([
    ['unknown finishes', undefined, 'foil'],
    ['nonfoil and foil', ['nonfoil', 'foil'], 'foil'],
    ['foil and etched', ['foil', 'etched'], 'foil'],
    ['etched only', ['etched'], 'etched'],
    ['nonfoil and etched', ['nonfoil', 'etched'], 'etched'],
  ] as [string, string[] | undefined, CardFinish][])('with %s, foil on → %s', (_, finishes, expected) => {
    expect(finishFor(card(finishes), true)).toBe(expected);
  });
});

describe('migrateCollectionItem (data saved before persist version 2)', () => {
  const old = {
    id: 'ci-1',
    userId: 'me',
    scryfallId: 'v1',
    oracleId: 'c1',
    quantity: 2,
    foil: false,
    condition: 'NM',
    createdAt: '2026-10-01T00:00:00.000Z',
  };

  it('renames the ids and drops the old fields', () => {
    expect(migrateCollectionItem(old)).toEqual({
      id: 'ci-1',
      userId: 'me',
      versionId: 'v1',
      cardId: 'c1',
      quantity: 2,
      finish: 'nonfoil',
      condition: 'NM',
      createdAt: '2026-10-01T00:00:00.000Z',
    });
  });

  it('turns foil: true into the foil finish', () => {
    expect(migrateCollectionItem({ ...old, foil: true }).finish).toBe('foil');
  });

  it.each([
    ['NM', 'NM'],
    ['LP', 'EX'],
    ['MP', 'GD'],
    ['HP', 'PL'],
    ['DMG', 'PO'],
  ])('maps the US grade %s to %s', (from, to) => {
    expect(migrateCollectionItem({ ...old, condition: from }).condition).toBe(to);
  });

  it('defaults a missing condition to Near Mint', () => {
    const { condition: _, ...noCondition } = old;
    expect(migrateCollectionItem(noCondition).condition).toBe('NM');
  });

  it('keeps fields that already have their new names', () => {
    const item = migrateCollectionItem({ ...old, versionId: 'v2', cardId: 'c2', finish: 'etched', condition: 'GD' });
    expect(item).toMatchObject({ versionId: 'v2', cardId: 'c2', finish: 'etched', condition: 'GD' });
  });
});

describe('matches the database enums', () => {
  it('lists the same conditions as card_condition, in the same order', () => {
    expect([...CARD_CONDITIONS]).toEqual(Constants.public.Enums.card_condition);
  });

  it('has a domain finish for every card_finish', () => {
    const finishes = Object.keys({ nonfoil: true, foil: true, etched: true } satisfies Record<CardFinish, true>);
    expect(finishes).toEqual(Constants.public.Enums.card_finish);
  });
});
