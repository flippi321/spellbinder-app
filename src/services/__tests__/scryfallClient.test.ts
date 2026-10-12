import type { CardIdentifier } from '@/types/scryfall';

import {
  ACCEPT_HEADER,
  CACHE_TTL_MS,
  COOLDOWN_AFTER_429_MS,
  createScryfallClient,
  type KeyValueStorage,
  ScryfallError,
} from '../scryfallClient';

interface FakeResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

function createMemoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
  };
}

/** A client wired to a fake clock: `sleep` advances time instantly so spacing is observable. */
function setup(opts: { storage?: KeyValueStorage; respond?: (url: string, init: RequestInit) => FakeResponse } = {}) {
  const clock = { now: 0 };
  const calls: { url: string; init: RequestInit; at: number }[] = [];
  const respond: (url: string, init: RequestInit) => FakeResponse =
    opts.respond ?? ((url) => ({ status: 200, body: { object: 'card', id: url, name: url } }));

  const fetchMock = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init, at: clock.now });
    const { status, body, headers = {} } = respond(url, init);
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name: string) => headers[name] ?? null },
      json: async () => body,
    };
  });

  const client = createScryfallClient({
    fetch: fetchMock as unknown as typeof fetch,
    storage: opts.storage,
    userAgent: 'Spellbinder/test',
    now: () => clock.now,
    sleep: async (ms) => {
      clock.now += ms;
    },
  });
  return { client, calls, clock, fetchMock };
}

describe('scryfallClient', () => {
  it('sends the headers Scryfall requires', async () => {
    const { client, calls } = setup();
    await client.getById('abc');

    const headers = calls[0].init.headers as Record<string, string>;
    expect(calls[0].url).toBe('https://api.scryfall.com/cards/abc');
    expect(headers['User-Agent']).toBe('Spellbinder/test');
    expect(headers.Accept).toBe(ACCEPT_HEADER);
  });

  it('spaces ordinary requests at least 100 ms apart', async () => {
    const { client, calls } = setup();
    await Promise.all([client.getById('a'), client.getById('b'), client.getById('c')]);

    expect(calls.map((c) => c.at)).toEqual([0, 100, 200]);
  });

  it('spaces search/named/collection requests at least 500 ms apart', async () => {
    const { client, calls } = setup();
    await Promise.all([
      client.getById('a'), // t=0
      client.getNamedFuzzy('sol ring'), // 100 ms after the previous request
      client.getNamedFuzzy('counterspel'), // 500 ms after the previous named request
      client.getById('b'), // only needs the 100 ms global gap
    ]);

    expect(calls.map((c) => c.at)).toEqual([0, 100, 600, 700]);
  });

  it('serves repeat requests from the memory cache and de-duplicates in-flight ones', async () => {
    const { client, fetchMock } = setup();
    await Promise.all([client.getById('a'), client.getById('a')]);
    await client.getById('a');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('persists responses for 24 hours and refetches after they expire', async () => {
    const storage = createMemoryStorage();
    const first = setup({ storage });
    await first.client.getById('a');

    const second = setup({ storage });
    await second.client.getById('a');
    expect(second.fetchMock).not.toHaveBeenCalled();

    const third = setup({ storage });
    third.clock.now = CACHE_TTL_MS + 1;
    await third.client.getById('a');
    expect(third.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('batches /cards/collection lookups in groups of 75', async () => {
    const { client, calls } = setup({
      respond: (_url, init) => {
        const { identifiers } = JSON.parse(String(init.body)) as { identifiers: { name: string }[] };
        const [missing, ...found] = identifiers;
        return {
          status: 200,
          body: {
            object: 'list',
            has_more: false,
            not_found: [missing],
            data: found.map((id) => ({ object: 'card', id: id.name, name: id.name })),
          },
        };
      },
    });
    const identifiers: CardIdentifier[] = Array.from({ length: 160 }, (_, i) => ({ name: `Card ${i}` }));

    const result = await client.getCollection(identifiers);

    const batchSizes = calls.map((c) => (JSON.parse(String(c.init.body)) as { identifiers: unknown[] }).identifiers.length);
    expect(batchSizes).toEqual([75, 75, 10]);
    expect(calls.map((c) => c.init.method)).toEqual(['POST', 'POST', 'POST']);
    expect(calls.map((c) => c.at)).toEqual([0, 500, 1000]);
    expect(result.cards).toHaveLength(157);
    expect(result.notFound).toHaveLength(3);
  });

  it('pauses the whole queue for 30 seconds after a 429', async () => {
    let first = true;
    const { client, calls } = setup({
      respond: (url) => {
        if (first) {
          first = false;
          return { status: 429, body: { object: 'error', code: 'rate_limited', status: 429, details: 'slow down' } };
        }
        return { status: 200, body: { object: 'card', id: url, name: url } };
      },
    });

    await expect(client.getById('a')).rejects.toMatchObject({ status: 429 });
    await client.getById('b');

    expect(calls[1].at).toBeGreaterThanOrEqual(COOLDOWN_AFTER_429_MS);
  });

  it('turns a search 404 into an empty list but surfaces other errors', async () => {
    const { client } = setup({
      respond: (url) =>
        url.includes('/cards/search')
          ? { status: 404, body: { object: 'error', code: 'not_found', status: 404, details: 'No cards found' } }
          : { status: 404, body: { object: 'error', code: 'not_found', status: 404, details: 'No card named that' } },
    });

    await expect(client.search('nonsense')).resolves.toMatchObject({ data: [], total_cards: 0 });
    await expect(client.getNamedFuzzy('nonsense')).rejects.toBeInstanceOf(ScryfallError);
  });

  it('skips autocomplete for queries shorter than two characters', async () => {
    const { client, fetchMock } = setup();
    await expect(client.autocomplete('s')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
