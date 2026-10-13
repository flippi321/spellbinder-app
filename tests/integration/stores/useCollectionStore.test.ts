import AsyncStorage from '@react-native-async-storage/async-storage';

import { setRepos, type Repos } from '@/data';
import { STORE_KEYS } from '@/stores/storage';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { useSessionStore } from '@/stores/useSessionStore';
import type { Card, CollectionItem } from '@/types';

const upsert = jest.fn(async (item: CollectionItem) => item);
const remove = jest.fn(async () => undefined);
const save = jest.fn(async () => undefined);
const fakeRepos = { collection: { upsert, remove }, cards: { save } } as unknown as Repos;

const card = (finishes?: string[]): Card => ({
  id: 'v-sol',
  oracle_id: 'c-sol',
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

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  setRepos(fakeRepos);
  useSessionStore.setState({ status: 'signedIn', user: { id: 'me', displayName: 'You', initials: 'YO', avatarColor: 'gold' } });
  useCollectionStore.setState({ items: [], seeded: true, loading: false, error: null });
});
afterAll(() => setRepos(null));

describe('adding copies', () => {
  it('adds a Near Mint nonfoil stack by version and card id', async () => {
    await useCollectionStore.getState().addCard(card(['nonfoil', 'foil']));
    expect(useCollectionStore.getState().items).toEqual([
      expect.objectContaining({ versionId: 'v-sol', cardId: 'c-sol', quantity: 1, finish: 'nonfoil', condition: 'NM' }),
    ]);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ finish: 'nonfoil', condition: 'NM' }));
  });

  it('adds foil copies as their own stack, and merges repeats', async () => {
    const { addCard } = useCollectionStore.getState();
    await addCard(card(['nonfoil', 'foil']));
    await addCard(card(['nonfoil', 'foil']), { foil: true });
    await addCard(card(['nonfoil', 'foil']), { foil: true, quantity: 2 });
    const items = useCollectionStore.getState().items;
    expect(items.map((item) => [item.finish, item.quantity])).toEqual([
      ['nonfoil', 1],
      ['foil', 3],
    ]);
  });

  it('adds an etched copy when the version only comes etched', async () => {
    await useCollectionStore.getState().addCard(card(['etched']), { foil: true });
    expect(useCollectionStore.getState().items[0].finish).toBe('etched');
  });

  it('starts a new Near Mint stack instead of growing a stack in another condition', async () => {
    useCollectionStore.setState({
      items: [{ id: 'old', userId: 'me', versionId: 'v-sol', cardId: 'c-sol', quantity: 1, finish: 'nonfoil', condition: 'GD', createdAt: 'x' }],
    });
    await useCollectionStore.getState().addCard(card());
    expect(useCollectionStore.getState().items.map((item) => item.condition)).toEqual(['GD', 'NM']);
  });

  it('still adds the copy when caching the card fails', async () => {
    save.mockRejectedValueOnce(new Error('offline'));
    await useCollectionStore.getState().addCard(card());
    expect(useCollectionStore.getState().items).toHaveLength(1);
  });

  it('removes a nonfoil copy before a foil or etched one', async () => {
    useCollectionStore.setState({
      items: [
        { id: 'etched', userId: 'me', versionId: 'v-sol', cardId: 'c-sol', quantity: 1, finish: 'etched', condition: 'NM', createdAt: 'x' },
        { id: 'plain', userId: 'me', versionId: 'v-other', cardId: 'c-sol', quantity: 1, finish: 'nonfoil', condition: 'NM', createdAt: 'x' },
      ],
    });
    await useCollectionStore.getState().changeQuantity(card(), -1);
    expect(useCollectionStore.getState().items.map((item) => item.id)).toEqual(['etched']);
    expect(remove).toHaveBeenCalledWith('plain');
  });
});

describe('persisted data from before version 2', () => {
  const rehydrate = async (version: number, items: unknown[]) => {
    await AsyncStorage.setItem(STORE_KEYS.collection, JSON.stringify({ state: { items, seeded: true }, version }));
    await useCollectionStore.persist.rehydrate();
    return useCollectionStore.getState().items;
  };

  it('renames ids, turns foil into a finish and maps US grades', async () => {
    const items = await rehydrate(1, [
      { id: 'a', userId: 'me', scryfallId: 'v1', oracleId: 'c1', quantity: 2, foil: true, condition: 'LP', createdAt: 'x' },
    ]);
    expect(items).toEqual([
      { id: 'a', userId: 'me', versionId: 'v1', cardId: 'c1', quantity: 2, finish: 'foil', condition: 'EX', createdAt: 'x' },
    ]);
    expect(useCollectionStore.getState().seeded).toBe(true);
  });

  it('leaves version 2 data alone (LP stays Light Played)', async () => {
    const current = { id: 'a', userId: 'me', versionId: 'v1', cardId: 'c1', quantity: 1, finish: 'nonfoil', condition: 'LP', createdAt: 'x' };
    expect(await rehydrate(2, [current])).toEqual([current]);
  });
});
