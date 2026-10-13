import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Shared AsyncStorage adapter for persisted stores. */
export const persistStorage = createJSONStorage(() => AsyncStorage);

export const STORE_KEYS = {
  cards: 'spellbinder.cards',
  collection: 'spellbinder.collection',
  decks: 'spellbinder.decks',
  /** Whose binder and decks the keys above hold (see `userData.ts`). */
  owner: 'spellbinder.owner',
} as const;
