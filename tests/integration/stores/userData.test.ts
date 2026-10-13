import AsyncStorage from '@react-native-async-storage/async-storage';

import { setRepos, type PlaygroupSnapshot, type Repos } from '@/data';
import { loadUserData, resetDemoData } from '@/stores/bootstrap';
import { STORE_KEYS } from '@/stores/storage';
import { useCardStore } from '@/stores/useCardStore';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { useDeckStore } from '@/stores/useDeckStore';
import { useOracleStore } from '@/stores/useOracleStore';
import { usePlaygroupStore } from '@/stores/usePlaygroupStore';
import { useScanStore } from '@/stores/useScanStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { clearUserData, dataOwnerKey, syncDataOwner, useDataOwnerStore, watchDataOwner } from '@/stores/userData';
import type { Card, CollectionItem, Deck, DataMode, Profile } from '@/types';

const mockConfig: { dataMode: DataMode; oracleMode: 'mock'; supabaseUrl: string; supabaseAnonKey: string } = {
  dataMode: 'supabase',
  oracleMode: 'mock',
  supabaseUrl: '',
  supabaseAnonKey: '',
};
// Lazy: jest.mock is hoisted above mockConfig's declaration.
jest.mock('@/config', () => ({
  get config() {
    return mockConfig;
  },
}));

const card = (id: string): Card => ({
  id: `v-${id}`,
  oracle_id: `c-${id}`,
  name: id,
  layout: 'normal',
  cmc: 1,
  type_line: 'Artifact',
  color_identity: [],
  legalities: {},
  set: 'cmm',
  collector_number: '1',
  rarity: 'uncommon',
});

const profile = (id: string, displayName: string): Profile => ({ id, displayName, initials: 'XX', avatarColor: 'gold' });
const alice = profile('user-a', 'Alice');
const bob = profile('user-b', 'Bob');

const item = (userId: string): CollectionItem => ({
  id: `item-${userId}`,
  userId,
  versionId: `v-${userId}`,
  cardId: `c-${userId}`,
  quantity: 1,
  finish: 'nonfoil',
  condition: 'NM',
  createdAt: '2026-10-13T00:00:00.000Z',
});
const deck = (ownerId: string): Deck => ({
  id: `deck-${ownerId}`,
  ownerId,
  name: `${ownerId}'s deck`,
  commanderCardId: `c-${ownerId}`,
  partnerCardId: null,
  theme: '',
  bracket: 2,
  createdAt: '2026-10-13T00:00:00.000Z',
  cards: [],
});
const snapshot = (userId: string): PlaygroupSnapshot => ({
  playgroup: { id: `group-${userId}`, name: `${userId}'s table`, inviteCode: 'ABCD1234', createdBy: userId },
  members: [],
  nextGameNight: null,
  rsvps: [],
  games: [],
  loans: [],
  memberItems: [],
});

/** A promise you resolve or reject later, to hold a request in flight. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

const repos = {
  session: {
    currentUser: jest.fn(async (): Promise<Profile | null> => null),
    signIn: jest.fn(async (email: string) => (email.startsWith('alice') ? alice : bob)),
    onAuthChange: jest.fn(() => () => undefined),
    signOut: jest.fn(async () => undefined),
  },
  collection: { list: jest.fn(async (userId: string) => [item(userId)]) },
  decks: { list: jest.fn(async (ownerId: string) => [deck(ownerId)]) },
  playgroup: { load: jest.fn(async (userId: string): Promise<PlaygroupSnapshot | null> => snapshot(userId)) },
  cards: { getByIds: jest.fn(async () => []), getByCardIds: jest.fn(async () => []) },
};

/** Everything a screen could show from the personal stores, as one searchable string. */
const visible = () =>
  JSON.stringify([
    useCollectionStore.getState().items,
    useDeckStore.getState().decks,
    usePlaygroupStore.getState().playgroup,
  ]);

/**
 * What a render could show after every burst of store changes, so a flash of old data can't hide between
 * assertions. React can't paint in the middle of synchronous code, so one snapshot per burst (taken in a
 * microtask) is exactly what the screens can see.
 */
function recordChanges() {
  const seen: string[] = [];
  let queued = false;
  const record = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      seen.push(visible());
    });
  };
  const stops = [useCollectionStore, useDeckStore, usePlaygroupStore].map((store) =>
    (store as { subscribe: (fn: () => void) => () => void }).subscribe(record),
  );
  return { seen, stop: () => stops.forEach((stop) => stop()) };
}

const signIn = async (email: string) => {
  expect(await useSessionStore.getState().signIn(email, 'password1')).toBe(true);
};

let stopWatching: () => void;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockConfig.dataMode = 'supabase';
  setRepos(repos as unknown as Repos);
  useSessionStore.setState({ status: 'signedOut', user: null, error: null, pending: false, authError: null });
  useDataOwnerStore.setState({ owner: null });
  clearUserData();
  useCardStore.getState().reset();
  stopWatching = watchDataOwner();
});
afterEach(() => stopWatching());
afterAll(() => setRepos(null));

describe('sign in as A, sign out, sign in as B', () => {
  it('never shows A’s data once A has signed out', async () => {
    await signIn('alice@spellbinder.test');
    await loadUserData();
    expect(visible()).toContain('user-a');

    const changes = recordChanges();
    await useSessionStore.getState().signOut();
    expect(visible()).not.toContain('user-a');

    await signIn('bob@spellbinder.test');
    await loadUserData();
    changes.stop();

    expect(useCollectionStore.getState().items).toEqual([item('user-b')]);
    expect(useDeckStore.getState().decks).toEqual([deck('user-b')]);
    expect(usePlaygroupStore.getState().playgroup?.id).toBe('group-user-b');
    expect(changes.seen.length).toBeGreaterThan(0);
    expect(changes.seen.filter((state) => state.includes('user-a'))).toEqual([]);
  });

  it('clears what is saved on the device at sign-out, not just what is on screen', async () => {
    await signIn('alice@spellbinder.test');
    await loadUserData();
    await flush();
    expect(await AsyncStorage.getItem(STORE_KEYS.collection)).toContain('user-a');

    await useSessionStore.getState().signOut();
    await flush();

    expect(await AsyncStorage.getItem(STORE_KEYS.collection)).not.toContain('user-a');
    expect(await AsyncStorage.getItem(STORE_KEYS.decks)).not.toContain('user-a');
    expect(JSON.parse((await AsyncStorage.getItem(STORE_KEYS.owner)) ?? '{}').state).toEqual({ owner: null });
  });

  it('clears A’s data when B signs in on a device A never signed out of (session revoked while closed)', async () => {
    await signIn('alice@spellbinder.test');
    await loadUserData();
    // B's sign-in replaces the session directly, without a signedOut step in between.
    const changes = recordChanges();
    await signIn('bob@spellbinder.test');
    expect(visible()).not.toContain('user-a');
    await loadUserData();
    changes.stop();
    expect(changes.seen.filter((state) => state.includes('user-a'))).toEqual([]);
  });

  it('drops A’s late answers that arrive after B has signed in', async () => {
    const lateItems = deferred<CollectionItem[]>();
    const lateDecks = deferred<Deck[]>();
    const lateGroup = deferred<PlaygroupSnapshot | null>();
    repos.collection.list.mockReturnValueOnce(lateItems.promise);
    repos.decks.list.mockReturnValueOnce(lateDecks.promise);
    repos.playgroup.load.mockReturnValueOnce(lateGroup.promise);

    await signIn('alice@spellbinder.test');
    const aliceLoad = loadUserData();
    await useSessionStore.getState().signOut();
    await signIn('bob@spellbinder.test');
    await loadUserData();

    lateItems.resolve([item('user-a')]);
    lateDecks.resolve([deck('user-a')]);
    lateGroup.resolve(snapshot('user-a'));
    await aliceLoad;

    expect(visible()).not.toContain('user-a');
    expect(useCollectionStore.getState().items).toEqual([item('user-b')]);
  });

  it('drops A’s late errors too', async () => {
    const lateItems = deferred<CollectionItem[]>();
    const lateDecks = deferred<Deck[]>();
    const lateGroup = deferred<PlaygroupSnapshot | null>();
    repos.collection.list.mockReturnValueOnce(lateItems.promise);
    repos.decks.list.mockReturnValueOnce(lateDecks.promise);
    repos.playgroup.load.mockReturnValueOnce(lateGroup.promise);

    await signIn('alice@spellbinder.test');
    const aliceLoad = loadUserData();
    await useSessionStore.getState().signOut();

    lateItems.reject(new Error('timeout'));
    lateDecks.reject(new Error('timeout'));
    lateGroup.reject(new Error('timeout'));
    await aliceLoad;

    expect(useCollectionStore.getState().error).toBeNull();
    expect(useDeckStore.getState().error).toBeNull();
    expect(usePlaygroupStore.getState()).toMatchObject({ status: 'idle', error: null });
  });

  it('drops a late "no playgroup" answer for A', async () => {
    const lateGroup = deferred<PlaygroupSnapshot | null>();
    repos.playgroup.load.mockReturnValueOnce(lateGroup.promise);
    await signIn('alice@spellbinder.test');
    const aliceLoad = loadUserData();
    await useSessionStore.getState().signOut();
    lateGroup.resolve(null);
    await aliceLoad;
    expect(usePlaygroupStore.getState().status).toBe('idle');
  });
});

describe('the signed-in user’s own answers still land', () => {
  it('shows their load errors', async () => {
    repos.collection.list.mockRejectedValueOnce(new Error('Supabase: offline'));
    repos.decks.list.mockRejectedValueOnce(new Error('Supabase: offline'));
    repos.playgroup.load.mockRejectedValueOnce(new Error('Supabase: offline'));
    await signIn('alice@spellbinder.test');
    await loadUserData();
    expect(useCollectionStore.getState()).toMatchObject({ loading: false, error: 'Supabase: offline' });
    expect(useDeckStore.getState()).toMatchObject({ loading: false, error: 'Supabase: offline' });
    expect(usePlaygroupStore.getState()).toMatchObject({ status: 'error', error: 'Supabase: offline' });
  });

  it('shows that they have no playgroup yet', async () => {
    repos.playgroup.load.mockResolvedValueOnce(null);
    await signIn('alice@spellbinder.test');
    await loadUserData();
    expect(usePlaygroupStore.getState().status).toBe('none');
  });
});

describe('syncDataOwner', () => {
  const fill = () => {
    useCollectionStore.setState({ items: [item('user-a')], seeded: true });
    useDeckStore.setState({ decks: [deck('user-a')], seeded: true });
  };

  it('keeps the data when the same user is still signed in (relaunch)', () => {
    useDataOwnerStore.setState({ owner: 'supabase:user-a' });
    fill();
    syncDataOwner({ status: 'signedIn', user: alice });
    expect(useCollectionStore.getState().items).toEqual([item('user-a')]);
    expect(useDeckStore.getState().seeded).toBe(true);
  });

  it.each(['idle', 'loading', 'error'] as const)('keeps the data while the session is %s (e.g. offline at launch)', (status) => {
    useDataOwnerStore.setState({ owner: 'supabase:user-a' });
    fill();
    syncDataOwner({ status, user: null });
    expect(useCollectionStore.getState().items).toEqual([item('user-a')]);
    expect(useDataOwnerStore.getState().owner).toBe('supabase:user-a');
  });

  it('clears data with no known owner when someone signs in (first launch after an update)', () => {
    fill();
    syncDataOwner({ status: 'signedIn', user: alice });
    expect(useCollectionStore.getState()).toMatchObject({ items: [], seeded: false });
    expect(useDataOwnerStore.getState().owner).toBe('supabase:user-a');
  });

  it('discards mock data when switching to Supabase mode, even for the same user id', () => {
    useDataOwnerStore.setState({ owner: 'mock:user-a' });
    fill();
    syncDataOwner({ status: 'signedIn', user: alice });
    expect(useCollectionStore.getState().items).toEqual([]);
    expect(useDataOwnerStore.getState().owner).toBe('supabase:user-a');
  });

  it('discards Supabase data when switching to mock mode', () => {
    mockConfig.dataMode = 'mock';
    useDataOwnerStore.setState({ owner: 'supabase:user-a' });
    fill();
    syncDataOwner({ status: 'signedIn', user: alice });
    expect(useDeckStore.getState().decks).toEqual([]);
    expect(useDataOwnerStore.getState().owner).toBe('mock:user-a');
  });

  it('treats signedIn without a user as signed out', () => {
    useDataOwnerStore.setState({ owner: 'supabase:user-a' });
    fill();
    syncDataOwner({ status: 'signedIn', user: null });
    expect(useCollectionStore.getState().items).toEqual([]);
    expect(useDataOwnerStore.getState().owner).toBeNull();
  });
});

describe('clearUserData', () => {
  it('clears binder, decks, playgroup, scan session and Oracle chat, but keeps the card cache', () => {
    useCardStore.getState().put([card('sol')]);
    useCollectionStore.setState({ items: [item('user-a')], seeded: true, loading: true, error: 'x' });
    useDeckStore.setState({ decks: [deck('user-a')], seeded: true });
    usePlaygroupStore.setState({ status: 'ready', playgroup: snapshot('user-a').playgroup, error: 'x' });
    useScanStore.setState({ session: [{ id: 's1' }] as never });
    useOracleStore.setState({ messages: [{ id: 'm1' }] as never, busy: true });

    clearUserData();

    expect(useCollectionStore.getState()).toMatchObject({ items: [], seeded: false, loading: false, error: null });
    expect(useDeckStore.getState()).toMatchObject({ decks: [], seeded: false });
    expect(usePlaygroupStore.getState()).toMatchObject({ status: 'idle', playgroup: null, error: null, memberItems: [] });
    expect(useScanStore.getState().session).toEqual([]);
    expect(useOracleStore.getState()).toMatchObject({ messages: [], busy: false });
    expect(useCardStore.getState().cards['v-sol']).toBeDefined();
  });
});

describe('watchDataOwner', () => {
  it('syncs straight away and returns the same watcher when called again', () => {
    stopWatching();
    useCollectionStore.setState({ items: [item('user-a')] });
    useDataOwnerStore.setState({ owner: 'supabase:user-a' });

    const stop = watchDataOwner(); // session is signedOut → clears now
    expect(useCollectionStore.getState().items).toEqual([]);
    expect(watchDataOwner()).toBe(stop);
    stopWatching = stop;
  });

  it('stops reacting once stopped', () => {
    stopWatching();
    useDataOwnerStore.setState({ owner: 'supabase:user-a' });
    useSessionStore.setState({ status: 'signedIn', user: alice });
    useCollectionStore.setState({ items: [item('user-a')] });

    useSessionStore.setState({ status: 'signedOut', user: null });
    expect(useCollectionStore.getState().items).toEqual([item('user-a')]);
    stopWatching = watchDataOwner();
  });
});

describe('resetDemoData', () => {
  it('still resets everything, card cache included, and reseeds the demo from the mock repos', async () => {
    mockConfig.dataMode = 'mock';
    useCardStore.getState().put([card('x')]);
    useOracleStore.setState({ messages: [{ id: 'm1' }] as never });
    useCollectionStore.setState({ items: [item('user-a')], seeded: true });

    await resetDemoData(); // drops the fake repos: the mock repos and seed take over

    const me = useSessionStore.getState().user;
    expect(useOracleStore.getState().messages).toEqual([]);
    expect(useCardStore.getState().cards['v-x']).toBeUndefined();
    expect(useCollectionStore.getState().items.length).toBeGreaterThan(0);
    expect(useCollectionStore.getState().items.every((stack) => stack.userId === me?.id)).toBe(true);
    expect(useDataOwnerStore.getState().owner).toBe(`mock:${me?.id}`);
  });
});

it('builds the owner key from data mode and user id', () => {
  expect(dataOwnerKey('mock', 'me')).toBe('mock:me');
  expect(dataOwnerKey('supabase', 'me')).toBe('supabase:me');
});
