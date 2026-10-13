import { useMemo } from 'react';

import type { Card, Profile } from '@/types';

import { binderTotals, buildBinderEntries, type BinderEntry, type BinderTotals } from './selectors/binder';
import {
  buildOwnershipIndex,
  friendFitCardIds,
  summarizeDeck,
  type DeckSummary,
  type OwnershipIndex,
} from './selectors/ownership';
import { useCardStore } from './useCardStore';
import { useCollectionStore } from './useCollectionStore';
import { useDeckStore } from './useDeckStore';
import { usePlaygroupStore } from './usePlaygroupStore';

/**
 * Derived views. Components select raw slices from stores and derive here with memoized
 * pure selectors — never return fresh arrays/objects from a zustand selector.
 */

export function useOwnershipIndex(): OwnershipIndex {
  const items = useCollectionStore((s) => s.items);
  const memberItems = usePlaygroupStore((s) => s.memberItems);
  return useMemo(() => buildOwnershipIndex(items, memberItems), [items, memberItems]);
}

export function useDeckSummaries(): Map<string, DeckSummary> {
  const decks = useDeckStore((s) => s.decks);
  const index = useOwnershipIndex();
  return useMemo(() => new Map(decks.map((deck) => [deck.id, summarizeDeck(deck, index)])), [decks, index]);
}

/** "3 cards friends own fit your decks" */
export function useFriendFitCount(): number {
  const decks = useDeckStore((s) => s.decks);
  const index = useOwnershipIndex();
  return useMemo(() => friendFitCardIds(decks, index).length, [decks, index]);
}

export function useBinderEntries(): BinderEntry[] {
  const items = useCollectionStore((s) => s.items);
  const decks = useDeckStore((s) => s.decks);
  return useMemo(() => buildBinderEntries(items, decks), [items, decks]);
}

export function useBinderTotals(): BinderTotals {
  const entries = useBinderEntries();
  return useMemo(() => binderTotals(entries), [entries]);
}

export function useMembersById(): Map<string, Profile> {
  const members = usePlaygroupStore((s) => s.members);
  return useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
}

/** Lookup for cards by card id (deck rows, chips). */
export function useCardLookup(): (cardId: string) => Card | undefined {
  const cards = useCardStore((s) => s.cards);
  const versionIdByCardId = useCardStore((s) => s.versionIdByCardId);
  return useMemo(
    () => (cardId: string) => {
      const id = versionIdByCardId[cardId];
      return id ? cards[id] : undefined;
    },
    [cards, versionIdByCardId],
  );
}

/** Find a cached card by name (Oracle chips reference cards by name). */
export function useCardNameLookup(): (name: string) => Card | undefined {
  const cards = useCardStore((s) => s.cards);
  return useMemo(() => {
    const byName = new Map<string, Card>();
    for (const card of Object.values(cards)) {
      byName.set(card.name.toLowerCase(), card);
      for (const face of card.card_faces ?? []) {
        if (!byName.has(face.name.toLowerCase())) byName.set(face.name.toLowerCase(), card);
      }
    }
    return (name: string) => byName.get(name.toLowerCase());
  }, [cards]);
}
