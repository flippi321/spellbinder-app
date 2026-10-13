import { fromCard } from '@/data/supabase/mappers';
import { createSupabaseRepos } from '@/data/supabase/supabaseRepos';
import { getCollection } from '@/services/scryfall';
import type { CollectionItem } from '@/types';
import type { ScryfallCard } from '@/types/scryfall';
import { GAME_NIGHT_WINDOW_MS } from '@/utils/gameNight';

/**
 * The card cache split (cards + card_versions), the card id / version id column names, and the rule that a write
 * naming a card makes sure the shared cache has it first (card references are foreign keys).
 */

type Result = { data: unknown; error: { message: string } | null };
type Call = [table: string, method: string, ...args: unknown[]];

let mockClient: unknown;
jest.mock('@/services/supabase', () => ({ getSupabase: () => mockClient }));
jest.mock('@/services/scryfall');

function fakeSupabase(results: Record<string, Result[]> = {}) {
  const calls: Call[] = [];
  const from = jest.fn((table: string) => {
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'in', 'or', 'gte', 'upsert', 'insert', 'update', 'delete', 'order', 'limit', 'maybeSingle', 'single']) {
      builder[method] = (...args: unknown[]) => {
        calls.push([table, method, ...args]);
        return builder;
      };
    }
    builder.then = (ok: (r: Result) => unknown, fail: (e: unknown) => unknown) =>
      Promise.resolve(results[table]?.shift() ?? { data: [], error: null }).then(ok, fail);
    return builder;
  });
  return { client: { from }, calls };
}

const card = (id: string, cardId: string, name = 'Sol Ring'): ScryfallCard => ({
  id,
  oracle_id: cardId,
  name,
  layout: 'normal',
  cmc: 1,
  type_line: 'Artifact',
  color_identity: [],
  legalities: { commander: 'legal' },
  set: 'cmm',
  collector_number: id,
  rarity: 'uncommon',
  finishes: ['nonfoil'],
});

/** A `card_versions` row with its card embedded, as `select('*, card:cards(*)')` returns it. */
const joinedRow = (scryfall: ScryfallCard) => {
  const { card: cardRow, version } = fromCard(scryfall, scryfall.oracle_id!);
  return { ...version, card: cardRow };
};

const mockGetCollection = jest.mocked(getCollection);
const ok = (data: unknown): Result => ({ data, error: null });
const writes = (calls: Call[]) => calls.filter(([, method]) => ['upsert', 'insert', 'delete'].includes(method));

let calls: Call[];
const setup = (results: Record<string, Result[]> = {}) => {
  const fake = fakeSupabase(results);
  mockClient = fake.client;
  calls = fake.calls;
  return createSupabaseRepos();
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCollection.mockResolvedValue({ cards: [], notFound: [] } as never);
});

describe('card cache', () => {
  it('writes cards (once per card) before their versions', async () => {
    const repos = setup();
    await repos.cards.save([card('v1', 'c1'), card('v2', 'c1'), card('v3', 'c2', 'Arcane Signet')]);

    expect(writes(calls).map(([table, , rows, options]) => [table, (rows as { id: string }[]).map((r) => r.id), options])).toEqual([
      ['cards', ['c1', 'c2'], { onConflict: 'id' }],
      ['card_versions', ['v1', 'v2', 'v3'], { onConflict: 'id' }],
    ]);
    const versions = writes(calls)[1][2] as { card_id: string }[];
    expect(versions.map((v) => v.card_id)).toEqual(['c1', 'c1', 'c2']);
  });

  it('writes nothing for an empty list', async () => {
    const repos = setup();
    await repos.cards.save([]);
    expect(calls).toEqual([]);
  });

  it('chunks big writes into 100-row upserts', async () => {
    const repos = setup();
    const many = Array.from({ length: 101 }, (_, i) => card(`v${i}`, `c${i}`));
    await repos.cards.save(many);
    expect(writes(calls).map(([table, , rows]) => [table, (rows as unknown[]).length])).toEqual([
      ['cards', 100],
      ['cards', 1],
      ['card_versions', 100],
      ['card_versions', 1],
    ]);
  });

  it('reads versions joined to their card by version id, without asking Scryfall', async () => {
    const sol = card('v1', 'c1');
    const repos = setup({ card_versions: [ok([joinedRow(sol)])] });

    await expect(repos.cards.getByIds(['v1'])).resolves.toEqual([sol]);
    expect(calls).toEqual([
      ['card_versions', 'select', '*, card:cards(*)'],
      ['card_versions', 'in', 'id', ['v1']],
    ]);
    expect(mockGetCollection).not.toHaveBeenCalled();
  });

  it('reads by card id and caches what the table lacks from Scryfall', async () => {
    const sol = card('v1', 'c1');
    const signet = card('v2', 'c2', 'Arcane Signet');
    mockGetCollection.mockResolvedValue({ cards: [signet], notFound: [] } as never);
    const repos = setup({ card_versions: [ok([joinedRow(sol)])] });

    const found = await repos.cards.getByCardIds(['c1', 'c2']);

    expect(found.map((c) => c.name)).toEqual(['Sol Ring', 'Arcane Signet']);
    expect(calls[1]).toEqual(['card_versions', 'in', 'card_id', ['c1', 'c2']]);
    expect(mockGetCollection).toHaveBeenCalledWith([{ oracle_id: 'c2' }]);
    expect(writes(calls).map(([table]) => table)).toEqual(['cards', 'card_versions']);
  });

  it('throws when Supabase returns an error', async () => {
    const repos = setup({ card_versions: [{ data: null, error: { message: 'permission denied' } }] });
    await expect(repos.cards.getByIds(['v1'])).rejects.toThrow('Supabase: permission denied');
  });
});

describe('writes that name a card make sure it is cached first', () => {
  const item: CollectionItem = {
    id: 'ci-1',
    userId: 'me',
    versionId: 'v1',
    cardId: 'c1',
    quantity: 1,
    finish: 'etched',
    condition: 'EX',
    createdAt: '2026-10-01T00:00:00.000Z',
  };

  it('collection: looks up the version, then upserts the stack with its finish and condition', async () => {
    const repos = setup({
      card_versions: [ok([joinedRow(card('v1', 'c1'))])],
      collection_items: [ok({ ...item, user_id: 'me', version_id: 'v1', card_id: 'c1', created_at: item.createdAt })],
    });

    await repos.collection.upsert(item);

    expect(calls.map(([table, method]) => `${table}.${method}`)).toEqual([
      'card_versions.select',
      'card_versions.in',
      'collection_items.upsert',
      'collection_items.select',
      'collection_items.single',
    ]);
    expect(calls[1]).toEqual(['card_versions', 'in', 'id', ['v1']]);
    expect(calls[2][2]).toMatchObject({ version_id: 'v1', card_id: 'c1', finish: 'etched', condition: 'EX' });
  });

  it('decks: caches the commander and cards, then inserts by card id', async () => {
    const repos = setup({
      card_versions: [ok([joinedRow(card('v-a', 'c-atraxa')), joinedRow(card('v1', 'c1'))])],
      decks: [ok({ id: 'd1', owner_id: 'me', name: 'Atraxa', commander_card_id: 'c-atraxa', partner_card_id: null, theme: null, bracket: 3, created_at: 'now' })],
    });

    const deck = await repos.decks.create({
      ownerId: 'me',
      name: 'Atraxa',
      commanderCardId: 'c-atraxa',
      theme: '',
      bracket: 3,
      cards: [{ cardId: 'c1', quantity: 1, category: 'Ramp', isCommander: false }],
    } as never);

    expect(calls[1]).toEqual(['card_versions', 'in', 'card_id', ['c-atraxa', 'c1']]);
    expect(calls.find(([table, method]) => table === 'decks' && method === 'insert')?.[2]).toMatchObject({
      commander_card_id: 'c-atraxa',
    });
    expect(calls.find(([table, method]) => table === 'deck_cards' && method === 'insert')?.[2]).toEqual([
      { deck_id: 'd1', card_id: 'c1', quantity: 1, category: 'Ramp', is_commander: false },
    ]);
    expect(deck.commanderCardId).toBe('c-atraxa');
  });

  it('deck cards: upserts on (deck_id, card_id) and removes by card id', async () => {
    const repos = setup({ card_versions: [ok([joinedRow(card('v1', 'c1'))])] });

    await repos.decks.upsertCard('d1', { cardId: 'c1', quantity: 1, category: 'Ramp', isCommander: false });
    await repos.decks.removeCard('d1', 'c1');

    expect(calls.find(([, method]) => method === 'upsert')?.[3]).toEqual({ onConflict: 'deck_id,card_id' });
    expect(calls.filter(([table, method]) => table === 'deck_cards' && method === 'eq')).toEqual([
      ['deck_cards', 'eq', 'deck_id', 'd1'],
      ['deck_cards', 'eq', 'card_id', 'c1'],
    ]);
  });

  it('loans: caches the card, then requests it by card id', async () => {
    const repos = setup({
      card_versions: [ok([joinedRow(card('v-rift', 'c-rift'))])],
      loan_requests: [ok({ id: 'l1', card_id: 'c-rift', requester_id: 'me', owner_id: 'erik', status: 'pending', note: null, created_at: 'now' })],
    });

    const loan = await repos.playgroup.requestLoan({ cardId: 'c-rift', requesterId: 'me', ownerId: 'erik', note: null });

    expect(calls[1]).toEqual(['card_versions', 'in', 'card_id', ['c-rift']]);
    expect(calls.find(([, method]) => method === 'insert')?.[2]).toMatchObject({ card_id: 'c-rift' });
    expect(loan.cardId).toBe('c-rift');
  });

  it('games: skips the cache without a winning commander and stores the game night', async () => {
    const repos = setup({
      games: [ok({ id: 'g1', playgroup_id: 'pg', played_at: 'now', winner_id: 'me', winner_commander_card_id: null, game_night_id: 'gn1', player_count: 4, duration_minutes: null })],
    });

    const game = await repos.playgroup.logGame({
      playgroupId: 'pg',
      playedAt: 'now',
      winnerId: 'me',
      winnerCommanderCardId: null,
      gameNightId: 'gn1',
      playerCount: 4,
      durationMinutes: null,
    });

    expect(calls.some(([table]) => table === 'card_versions')).toBe(false);
    expect(calls.find(([, method]) => method === 'insert')?.[2]).toMatchObject({
      winner_commander_card_id: null,
      game_night_id: 'gn1',
    });
    expect(game.gameNightId).toBe('gn1');
  });

  it('games: caches the winning commander when there is one', async () => {
    const repos = setup({
      card_versions: [ok([joinedRow(card('v-k', 'c-krenko'))])],
      games: [ok({ id: 'g1', playgroup_id: 'pg', played_at: 'now', winner_id: 'me', winner_commander_card_id: 'c-krenko', game_night_id: null, player_count: 4, duration_minutes: null })],
    });

    await repos.playgroup.logGame({
      playgroupId: 'pg',
      playedAt: 'now',
      winnerId: 'me',
      winnerCommanderCardId: 'c-krenko',
      gameNightId: null,
      playerCount: 4,
      durationMinutes: null,
    });

    expect(calls[1]).toEqual(['card_versions', 'in', 'card_id', ['c-krenko']]);
  });
});

describe('playgroup load', () => {
  it('keeps tonight\'s game night until 12 h after it starts', async () => {
    const repos = setup({
      playgroup_members: [ok({ playgroup_id: 'pg' }), ok([])],
      playgroups: [ok({ id: 'pg', name: 'The Thursday Table', invite_code: 'X', created_by: 'me' })],
    });

    const before = Date.now();
    await repos.playgroup.load('me');
    const after = Date.now();

    const [, , column, since] = calls.find(([table, method]) => table === 'game_nights' && method === 'gte')!;
    expect(column).toBe('starts_at');
    const sinceMs = new Date(since as string).getTime();
    expect(sinceMs).toBeGreaterThanOrEqual(before - GAME_NIGHT_WINDOW_MS);
    expect(sinceMs).toBeLessThanOrEqual(after - GAME_NIGHT_WINDOW_MS);
  });
});
