import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORE_KEYS } from '@/stores/storage';
import { useDeckStore } from '@/stores/useDeckStore';

describe('persisted decks from before version 2', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useDeckStore.setState({ decks: [], seeded: false });
  });

  const rehydrate = async (version: number, decks: unknown[]) => {
    await AsyncStorage.setItem(STORE_KEYS.decks, JSON.stringify({ state: { decks, seeded: true }, version }));
    await useDeckStore.persist.rehydrate();
    return useDeckStore.getState().decks;
  };

  const base = { id: 'd1', ownerId: 'me', name: 'Atraxa', theme: '', bracket: 3, createdAt: 'x' };

  it('renames oracle ids to card ids, with and without a partner', async () => {
    const decks = await rehydrate(1, [
      { ...base, commanderOracleId: 'c-atraxa', partnerOracleId: null, cards: [{ oracleId: 'c-sol', quantity: 1, category: 'Ramp', isCommander: false }] },
      { ...base, id: 'd2', commanderOracleId: 'c-thrasios', partnerOracleId: 'c-tymna', cards: [] },
    ]);
    expect(decks).toEqual([
      { ...base, commanderCardId: 'c-atraxa', partnerCardId: null, cards: [{ cardId: 'c-sol', quantity: 1, category: 'Ramp', isCommander: false }] },
      { ...base, id: 'd2', commanderCardId: 'c-thrasios', partnerCardId: 'c-tymna', cards: [] },
    ]);
    expect(useDeckStore.getState().seeded).toBe(true);
  });

  it('handles a deck saved without a partner or cards', async () => {
    const [deck] = await rehydrate(1, [{ ...base, commanderOracleId: 'c-atraxa' }]);
    expect(deck).toMatchObject({ commanderCardId: 'c-atraxa', partnerCardId: null, cards: [] });
  });

  it('leaves version 2 decks alone', async () => {
    const current = { ...base, commanderCardId: 'c-atraxa', partnerCardId: null, cards: [] };
    expect(await rehydrate(2, [current])).toEqual([current]);
  });
});
