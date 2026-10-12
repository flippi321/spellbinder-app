import { ORACLE_ANSWERS } from '@/services/oracleAnswers';
import { binderTotals, buildBinderEntries } from '@/stores/selectors/binder';
import { buildOwnershipIndex, friendFitOracleIds, summarizeDeck } from '@/stores/selectors/ownership';
import { goingCount, leaderboard } from '@/stores/selectors/playgroup';
import { getOracleId } from '@/utils/cards';
import { checkCommanderDeck } from '@/utils/deckLegality';

import { collectionItemsFromSeed, decksFromSeed, gamesFromSeed } from '../builders';
import { catalog } from '../catalog';
import { buildBinderSeed, FRIEND_COLLECTIONS, ME, PROFILES, SEED_RSVPS } from '../seed';

/** Keeps the mock seed consistent with the numbers in docs/VISION.md §4 and §8. */

const myItems = collectionItemsFromSeed(ME, buildBinderSeed());
const memberItems = Object.entries(FRIEND_COLLECTIONS).flatMap(([id, copies]) => collectionItemsFromSeed(id, copies));
const decks = decksFromSeed(ME);
const index = buildOwnershipIndex(myItems, memberItems);
const entries = buildBinderEntries(myItems, decks);
const byName = (name: string) => decks.find((deck) => deck.name.startsWith(name))!;

describe('mock seed', () => {
  it.each(decks.map((deck) => [deck.name, deck]))('%s is a legal 100-card Commander deck', (_name, deck) => {
    expect(checkCommanderDeck(deck, catalog.byOracle)).toEqual({ legal: true, issues: [] });
  });

  it('matches the ownership numbers in the vision', () => {
    expect(summarizeDeck(byName('Atraxa'), index)).toMatchObject({ owned: 94, notOwned: 6, inGroup: 2 });
    expect(summarizeDeck(byName('Krenko'), index)).toMatchObject({ complete: true });
    expect(summarizeDeck(byName('Muldrotha'), index)).toMatchObject({ owned: 88, notOwned: 12 });
    expect(summarizeDeck(byName('Edgar'), index)).toMatchObject({ owned: 95, notOwned: 5 });
    expect(friendFitOracleIds(decks, index)).toHaveLength(3);
  });

  it('matches the binder header: 1,284 cards · 618 spare · 64 foils', () => {
    expect(binderTotals(entries)).toMatchObject({ cards: 1284, spare: 618, foils: 64 });
  });

  it('matches the playgroup: 4 of 5 going and the season leaderboard', () => {
    expect(goingCount(SEED_RSVPS)).toBe(4);
    const rows = leaderboard(gamesFromSeed(new Date('2026-10-12T12:00:00')), PROFILES);
    expect(rows.map((r) => [r.profile.displayName, r.wins])).toEqual([
      ['Mira', 7],
      ['Jonas', 5],
      ['You', 4],
      ['Erik', 3],
      ['Sanna', 2],
    ]);
  });

  it('keeps the canned Oracle answers true', () => {
    const chips = Object.values(ORACLE_ANSWERS).flatMap((answer) => answer.sections.flatMap((s) => s.chips ?? []));
    const owners = (name: string) => index.friendOwners.get(getOracleId(catalog.require(name))) ?? [];
    for (const chip of chips) {
      const entry = entries.find((e) => e.oracleId === getOracleId(catalog.require(chip.name)));
      if (chip.note === 'Spare in your binder') expect([chip.name, entry?.deckIds]).toEqual([chip.name, []]);
      const friend = chip.note.match(/^(\w+) has one$/)?.[1];
      if (friend) {
        const friendId = PROFILES.find((p) => p.displayName === friend)!.id;
        expect([chip.name, owners(chip.name)]).toEqual([chip.name, expect.arrayContaining([friendId])]);
      }
    }
  });
});
