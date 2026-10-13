import type {
  CardIdentifier,
  ScryfallCard,
  ScryfallCatalog,
  ScryfallErrorBody,
  ScryfallList,
} from '@/types/scryfall';

/**
 * Rate-limited, caching Scryfall client. This module has no React Native imports so the
 * seed script (Node) and Jest can use it directly; the app instance lives in `./scryfall.ts`.
 *
 * Etiquette (https://scryfall.com/docs/api, /docs/api/rate-limits — checked Oct 2026):
 * - Every request sends `User-Agent: AppName/version` and an `Accept` header.
 * - /cards/search, /cards/named, /cards/random, /cards/collection: max 2 req/s (500 ms apart).
 *   Every other endpoint: max 10 req/s (100 ms apart). Image hosts (*.scryfall.io) are unlimited.
 * - An HTTP 429 locks you out for 30 s; we pause the whole queue and never retry in a loop.
 * - Cache responses for at least 24 h.
 */

export const RATE_LIMIT_MS = {
  default: 100,
  search: 500,
  named: 500,
  random: 500,
  collection: 500,
} as const;
export const COOLDOWN_AFTER_429_MS = 30_000;
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const COLLECTION_BATCH_SIZE = 75;
export const ACCEPT_HEADER = 'application/json;q=0.9,*/*;q=0.8';
const STORAGE_PREFIX = 'scryfall:v1:';

type LimitGroup = keyof typeof RATE_LIMIT_MS;

/** The slice of AsyncStorage the client needs (AsyncStorage satisfies it). */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  getAllKeys?(): Promise<readonly string[]>;
  multiRemove?(keys: readonly string[]): Promise<void>;
}

export interface ScryfallClientOptions {
  fetch: typeof fetch;
  /** Persistent cache (AsyncStorage in the app). Memory cache is always on. */
  storage?: KeyValueStorage;
  /** e.g. `Spellbinder/0.1.0`. Omit on web — browsers send their own and Scryfall asks you keep it. */
  userAgent?: string;
  baseUrl?: string;
  cacheTtlMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export class ScryfallError extends Error {
  status: number;
  code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ScryfallError';
    this.status = status;
    this.code = code;
  }
}

export interface SearchOptions {
  unique?: 'cards' | 'art' | 'prints';
  order?: string;
  dir?: 'auto' | 'asc' | 'desc';
  page?: number;
}

export interface CollectionResult {
  cards: ScryfallCard[];
  notFound: CardIdentifier[];
}

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

function limitGroupFor(path: string): LimitGroup {
  if (path.startsWith('/cards/search')) return 'search';
  if (path.startsWith('/cards/named')) return 'named';
  if (path.startsWith('/cards/random')) return 'random';
  if (path.startsWith('/cards/collection')) return 'collection';
  return 'default';
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createScryfallClient(options: ScryfallClientOptions) {
  const {
    fetch: fetchImpl,
    storage,
    userAgent,
    baseUrl = 'https://api.scryfall.com',
    cacheTtlMs = CACHE_TTL_MS,
    now = Date.now,
    sleep = defaultSleep,
  } = options;

  // ---- Serial request queue with per-endpoint spacing ---------------------------------------
  let queue: Promise<unknown> = Promise.resolve();
  let lastRequestAt = Number.NEGATIVE_INFINITY;
  const lastRequestByGroup: Partial<Record<LimitGroup, number>> = {};
  let cooldownUntil = 0;

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  }

  function request<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}) {
    return enqueue(async () => {
      const group = limitGroupFor(path);
      const readyAt = Math.max(
        lastRequestAt + RATE_LIMIT_MS.default,
        (lastRequestByGroup[group] ?? Number.NEGATIVE_INFINITY) + RATE_LIMIT_MS[group],
        cooldownUntil,
      );
      const wait = readyAt - now();
      if (wait > 0) await sleep(wait);

      const startedAt = now();
      lastRequestAt = startedAt;
      lastRequestByGroup[group] = startedAt;

      const headers: Record<string, string> = { Accept: ACCEPT_HEADER };
      if (userAgent) headers['User-Agent'] = userAgent;
      if (init.body !== undefined) headers['Content-Type'] = 'application/json';

      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });

      if (response.status === 429) {
        const retryAfterSeconds = Number(response.headers.get('Retry-After'));
        const retryAfterMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 0;
        cooldownUntil = now() + Math.max(COOLDOWN_AFTER_429_MS, retryAfterMs);
        throw new ScryfallError('Scryfall is rate limiting us — pausing for 30 seconds.', 429, 'rate_limited');
      }

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        // Non-JSON body (e.g. a proxy error page) — handled below.
      }
      if (!response.ok) {
        const error = body as Partial<ScryfallErrorBody> | null;
        throw new ScryfallError(
          error?.details ?? `Scryfall request failed (${response.status})`,
          response.status,
          error?.code,
        );
      }
      return body as T;
    });
  }

  // ---- Two-level cache (memory + optional persistent storage), 24 h TTL ----------------------
  const memory = new Map<string, CacheEntry>();
  const inFlight = new Map<string, Promise<unknown>>();

  async function readStorage(key: string): Promise<CacheEntry | null> {
    if (!storage) return null;
    try {
      const raw = await storage.getItem(STORAGE_PREFIX + key);
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry;
      return entry.expiresAt > now() ? entry : null;
    } catch {
      return null;
    }
  }

  function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = memory.get(key);
    if (hit && hit.expiresAt > now()) return Promise.resolve(hit.value as T);

    const pending = inFlight.get(key);
    if (pending) return pending as Promise<T>;

    const promise = (async () => {
      const stored = await readStorage(key);
      if (stored) {
        memory.set(key, stored);
        return stored.value as T;
      }
      const value = await load();
      const entry: CacheEntry = { expiresAt: now() + cacheTtlMs, value };
      memory.set(key, entry);
      if (storage) {
        await storage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry)).catch(() => undefined);
      }
      return value;
    })();

    inFlight.set(key, promise);
    return promise.finally(() => inFlight.delete(key));
  }

  const getJson = <T>(path: string) => cached(`GET ${path}`, () => request<T>(path));

  // ---- Endpoints -----------------------------------------------------------------------------
  async function autocomplete(query: string): Promise<string[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const catalog = await getJson<ScryfallCatalog>(`/cards/autocomplete?q=${encodeURIComponent(q)}`);
    return catalog.data;
  }

  async function search(query: string, opts: SearchOptions = {}): Promise<ScryfallList<ScryfallCard>> {
    const params = new URLSearchParams({ q: query });
    if (opts.unique) params.set('unique', opts.unique);
    if (opts.order) params.set('order', opts.order);
    if (opts.dir) params.set('dir', opts.dir);
    if (opts.page) params.set('page', String(opts.page));
    try {
      return await getJson<ScryfallList<ScryfallCard>>(`/cards/search?${params.toString()}`);
    } catch (error) {
      // Scryfall answers "no results" with a 404.
      if (error instanceof ScryfallError && error.status === 404) {
        return { object: 'list', data: [], has_more: false, total_cards: 0 };
      }
      throw error;
    }
  }

  const getById = (id: string) => getJson<ScryfallCard>(`/cards/${encodeURIComponent(id)}`);

  const getNamedFuzzy = (name: string) =>
    getJson<ScryfallCard>(`/cards/named?fuzzy=${encodeURIComponent(name)}`);

  const getNamedExact = (name: string) =>
    getJson<ScryfallCard>(`/cards/named?exact=${encodeURIComponent(name)}`);

  async function getCollection(identifiers: CardIdentifier[]): Promise<CollectionResult> {
    const cards: ScryfallCard[] = [];
    const notFound: CardIdentifier[] = [];
    for (let i = 0; i < identifiers.length; i += COLLECTION_BATCH_SIZE) {
      const batch = identifiers.slice(i, i + COLLECTION_BATCH_SIZE);
      const body = { identifiers: batch };
      const result = await cached(`POST /cards/collection ${JSON.stringify(body)}`, () =>
        request<ScryfallList<ScryfallCard>>('/cards/collection', { method: 'POST', body }),
      );
      cards.push(...result.data);
      notFound.push(...(result.not_found ?? []));
    }
    return { cards, notFound };
  }

  async function getPrintings(cardId: string): Promise<ScryfallCard[]> {
    const list = await search(`oracleid:${cardId}`, { unique: 'prints', order: 'released', dir: 'desc' });
    return list.data;
  }

  /** Drops the memory cache and every persisted Scryfall entry. */
  async function clearCache(): Promise<void> {
    memory.clear();
    if (!storage?.getAllKeys || !storage.multiRemove) return;
    const keys = (await storage.getAllKeys()).filter((key) => key.startsWith(STORAGE_PREFIX));
    if (keys.length > 0) await storage.multiRemove(keys);
  }

  return {
    autocomplete,
    search,
    getById,
    getNamedFuzzy,
    getNamedExact,
    getCollection,
    getPrintings,
    clearCache,
  };
}

export type ScryfallClient = ReturnType<typeof createScryfallClient>;
