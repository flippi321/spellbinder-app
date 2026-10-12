import type { Card } from '@/types';
import { slimCard } from '@/utils/cards';

import { MOCK_SCAN_NAMES } from './scanSamples';
import { getNamedFuzzy } from './scryfall';

/**
 * Scan pipeline (VISION §7): camera capture → recognizeCardName → Scryfall fuzzy lookup
 * → confirmation sheet. Recognition is an adapter so real OCR can drop in later.
 */

export interface Recognition {
  name: string;
  /** 0–1 */
  confidence: number;
}

export interface Identification {
  card: Card;
  confidence: number;
  recognizedName: string;
}

const pause = (ms: number) =>
  process.env.NODE_ENV === 'test' ? Promise.resolve() : new Promise<void>((resolve) => setTimeout(resolve, ms));

let rotation = 0;

/**
 * Turns a photo of a card into its name.
 *
 * Mock: ignores the image and rotates through sample names so the whole flow works in
 * Expo Go and simulators.
 *
 * TODO(ocr): real recognition needs a development build (not Expo Go): run on-device text
 * recognition (ML Kit on Android / Vision on iOS) over the title line of `imageUri`, then
 * let the Scryfall fuzzy lookup absorb OCR typos. Keep this signature so callers don't change.
 */
export async function recognizeCardName(imageUri: string | null): Promise<Recognition> {
  void imageUri;
  await pause(450);
  const name = MOCK_SCAN_NAMES[rotation % MOCK_SCAN_NAMES.length];
  rotation += 1;
  return { name, confidence: 0.98 };
}

/** Resets the mock rotation (tests). */
export function resetRecognizer(): void {
  rotation = 0;
}

/**
 * Recognition followed by a card lookup. Defaults to a Scryfall fuzzy match; stores pass
 * their repository's lookup so mock mode can fall back to the bundled catalog offline.
 * Resolves to null when nothing matches.
 */
export async function identifyCard(
  imageUri: string | null,
  lookup: (name: string) => Promise<Card | null> = async (name) => slimCard(await getNamedFuzzy(name)),
): Promise<Identification | null> {
  const { name, confidence } = await recognizeCardName(imageUri);
  const card = await lookup(name);
  return card ? { card, confidence, recognizedName: name } : null;
}
