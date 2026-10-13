import type { Card, CardCondition, CardFinish, CollectionItem } from '@/types';
import { Constants } from '@/types/database';
import {
  CARD_CONDITIONS,
  CONDITION_LABELS,
  DEFAULT_CONDITION,
  finishFor,
  isFoil,
  mergeCollectionItems,
  migrateCollectionItem,
  sameRow,
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

const row = (overrides: Partial<CollectionItem> = {}): CollectionItem => ({
  userId: 'me',
  versionId: 'v1',
  cardId: 'c1',
  quantity: 1,
  finish: 'nonfoil',
  condition: 'NM',
  createdAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

describe('sameRow', () => {
  it('is the same row when user, version and finish match, whatever the condition or quantity', () => {
    expect(sameRow(row(), row({ condition: 'PO', quantity: 4 }))).toBe(true);
  });

  it.each([
    ['user', { userId: 'friend' }],
    ['version', { versionId: 'v2' }],
    ['finish', { finish: 'foil' }],
  ] as [string, Partial<CollectionItem>][])('is another row when the %s differs', (_, change) => {
    expect(sameRow(row(), row(change))).toBe(false);
  });
});

describe('mergeCollectionItems (stacks saved before persist version 3)', () => {
  it('sums stacks of one row, keeping the first condition, the earliest createdAt and the latest updatedAt', () => {
    const merged = mergeCollectionItems([
      row({ quantity: 1, condition: 'EX', createdAt: '2026-10-03', updatedAt: '2026-10-04' }),
      row({ quantity: 2, createdAt: '2026-10-01', updatedAt: '2026-10-05' }),
    ]);
    expect(merged).toEqual([row({ quantity: 3, condition: 'EX', createdAt: '2026-10-01', updatedAt: '2026-10-05' })]);
  });

  it('keeps other finishes, versions and users as their own rows, in order', () => {
    const items = [row(), row({ finish: 'foil' }), row({ versionId: 'v2' }), row({ userId: 'friend' })];
    expect(mergeCollectionItems(items)).toEqual(items);
  });

  it('drops the old stack id and leaves its input alone', () => {
    const old = { ...row(), id: 'ci-1' } as CollectionItem;
    expect(mergeCollectionItems([old, row()])).toEqual([row({ quantity: 2 })]);
    expect(old.quantity).toBe(1);
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
