import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { createScryfallClient } from './scryfallClient';

/**
 * The app's single Scryfall client. Everything that talks to api.scryfall.com goes through
 * this instance so the rate limits and the 24 h cache are shared app-wide.
 */
const appVersion = Constants.expoConfig?.version ?? '0.0.0';

export const scryfall = createScryfallClient({
  fetch: (input, init) => fetch(input, init),
  storage: AsyncStorage,
  // Browsers forbid overriding User-Agent; Scryfall asks web clients to keep the browser's.
  userAgent: Platform.OS === 'web' ? undefined : `Spellbinder/${appVersion}`,
});

export const {
  autocomplete,
  search,
  getById,
  getNamedFuzzy,
  getNamedExact,
  getCollection,
  getPrintings,
  clearCache,
} = scryfall;

export { ScryfallError } from './scryfallClient';
export { getArtist, getCardFaces, getImageUri, getCardId } from '@/utils/cards';
