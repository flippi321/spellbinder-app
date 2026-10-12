import { create } from 'zustand';

import { getRepos } from '@/data';
import { identifyCard } from '@/services/scan';
import type { Card, ToastMessage } from '@/types';
import { messageOf } from '@/utils/errors';
import { shortDeckName } from '@/utils/format';

import { useCardStore } from './useCardStore';
import { useCollectionStore } from './useCollectionStore';
import { useDeckStore } from './useDeckStore';

export type ScanDestination = { kind: 'binder' } | { kind: 'deck'; deckId: string };

export type ScanStatus = 'scanning' | 'identifying' | 'matched' | 'error';

export interface ScanMatch {
  card: Card;
  /** 0–1, from recognition. */
  confidence: number;
}

/** One confirmed card in the "N scanned" tray. */
export interface ScanSessionEntry {
  key: string;
  card: Card;
  quantity: number;
  foil: boolean;
  destination: ScanDestination;
}

interface ScanState {
  status: ScanStatus;
  match: ScanMatch | null;
  foil: boolean;
  quantity: number;
  destination: ScanDestination;
  session: ScanSessionEntry[];
  toast: ToastMessage | null;
  error: string | null;
  setDestination(destination: ScanDestination): void;
  /** Shutter: recognize the photo, then look the card up. */
  capture(imageUri: string | null): Promise<void>;
  /** Manual pick ("Type it", "Change printing"). */
  selectCard(card: Card, confidence?: number): void;
  toggleFoil(): void;
  setQuantity(quantity: number): void;
  rescan(): void;
  /** "Add 1 to binder": writes to the collection or deck, shows the toast, back to scanning. */
  confirmAdd(): Promise<void>;
  dismissToast(): void;
  /** Leaving the scanner: clears the tray and match, keeps the destination. */
  endSession(): void;
}

let toastId = 0;

const ready = { status: 'scanning' as const, match: null, foil: false, quantity: 1, error: null };

export const useScanStore = create<ScanState>()((set, get) => ({
  ...ready,
  destination: { kind: 'binder' },
  session: [],
  toast: null,

  setDestination: (destination) => set({ destination }),

  async capture(imageUri) {
    if (get().status === 'identifying') return;
    set({ status: 'identifying', match: null, error: null });
    try {
      const result = await identifyCard(imageUri, (name) =>
        getRepos().cards.findByName(name, { fuzzy: true }),
      );
      if (!result) {
        set({ status: 'error', error: 'No card matched. Try again, or type the name.' });
        return;
      }
      useCardStore.getState().put([result.card]);
      set({ ...ready, status: 'matched', match: { card: result.card, confidence: result.confidence } });
    } catch (error) {
      set({ status: 'error', error: messageOf(error) });
    }
  },

  selectCard(card, confidence = 1) {
    useCardStore.getState().put([card]);
    const keepFoilAndQuantity = get().match !== null;
    set((state) => ({
      status: 'matched',
      match: { card, confidence },
      error: null,
      foil: keepFoilAndQuantity ? state.foil : false,
      quantity: keepFoilAndQuantity ? state.quantity : 1,
    }));
  },

  toggleFoil: () => set((state) => ({ foil: !state.foil })),

  setQuantity: (quantity) => set({ quantity: Math.max(1, Math.min(99, quantity)) }),

  rescan: () => set(ready),

  async confirmAdd() {
    const { match, quantity, foil, destination } = get();
    if (!match) return;
    try {
      let message: string;
      if (destination.kind === 'binder') {
        await useCollectionStore.getState().addCard(match.card, { quantity, foil });
        message = `Added ${quantity}× ${match.card.name}`;
      } else {
        const deck = useDeckStore.getState().decks.find((d) => d.id === destination.deckId);
        const result = await useDeckStore.getState().addCard(destination.deckId, match.card, { quantity });
        const deckName = shortDeckName(deck?.name ?? 'deck');
        message =
          result === 'added' ? `Added ${match.card.name} to ${deckName}` : `${match.card.name} is already in ${deckName}`;
      }
      toastId += 1;
      set((state) => ({
        ...ready,
        session: [
          ...state.session,
          { key: `${match.card.id}-${toastId}`, card: match.card, quantity, foil, destination },
        ],
        toast: { id: toastId, message },
      }));
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  dismissToast: () => set({ toast: null }),

  endSession: () => set({ ...ready, session: [], toast: null }),
}));
