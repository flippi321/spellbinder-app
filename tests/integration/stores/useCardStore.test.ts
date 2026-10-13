import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORE_KEYS } from '@/stores/storage';
import { useCardStore } from '@/stores/useCardStore';

describe('persisted card cache from before version 2', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useCardStore.setState({ cards: {}, versionIdByCardId: {} });
  });

  const rehydrate = async (version: number, state: unknown) => {
    await AsyncStorage.setItem(STORE_KEYS.cards, JSON.stringify({ state, version }));
    await useCardStore.persist.rehydrate();
    return useCardStore.getState();
  };

  it('keeps the cards and renames the oracleToId index', async () => {
    const state = await rehydrate(1, { cards: { v1: { id: 'v1', name: 'Sol Ring' } }, oracleToId: { c1: 'v1' } });
    expect(state.versionIdByCardId).toEqual({ c1: 'v1' });
    expect(state.cards.v1.name).toBe('Sol Ring');
  });

  it('starts empty when version 1 saved nothing', async () => {
    const state = await rehydrate(1, null);
    expect(state.cards).toEqual({});
    expect(state.versionIdByCardId).toEqual({});
  });

  it('leaves version 2 data alone', async () => {
    const state = await rehydrate(2, { cards: {}, versionIdByCardId: { c1: 'v1' } });
    expect(state.versionIdByCardId).toEqual({ c1: 'v1' });
  });
});
