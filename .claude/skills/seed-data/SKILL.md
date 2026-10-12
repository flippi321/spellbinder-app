---
name: seed-data
description: Change Spellbinder's mock-mode seed data — binder cards, decks, friends' collections, loans, game nights, Oracle sample cards — and regenerate the bundled Scryfall card data. Use when adding or renaming seed cards, adding a sample deck or member, or when seedIntegrity.test.ts fails or the vision's numbers (94% owned, 1,284 cards…) drift.
argument-hint: <seed change>
---

# Mock seed data

Mock mode (`EXPO_PUBLIC_DATA_MODE=mock`, the default) runs the whole app from seed data with no backend. The seed is
written by **real card name**; the real Scryfall data behind those names is bundled in `src/data/mock/cards.json`.
The sample world is described in `docs/VISION.md` §8 and the numbers on screen in §4.

## Where things live
| File | Holds |
|---|---|
| `src/data/mock/seed/decks.ts` | `SEED_DECKS`: category → slots (`'Name'` or `['Island', 12]` for basics). The commander is added automatically. |
| `src/data/mock/seed/binder.ts` | `NOT_OWNED` (deck cards you don't own), `DECK_CARD_COPIES`, `SPARES`, `buildBinderSeed()` (owned deck cards + spares), `deckCardNames()` |
| `src/data/mock/seed/playgroup.ts` | `ME`/`JONAS`/…, `PROFILES`, `PLAYGROUP`, `MEMBERS`, `FRIEND_COLLECTIONS`, `SEED_LOANS`, RSVPs, game night |
| `src/data/mock/seed/index.ts` | `ORACLE_CARD_NAMES`, `allSeedCardNames()` (input to the generator) |
| `src/services/scanSamples.ts` | `MOCK_SCAN_NAMES` — cards the mock scanner "recognizes" |
| `src/services/oracleAnswers.ts` | The three canned Oracle answers (their chips must stay true for the seed) |
| `src/data/mock/builders.ts` | Turns seed → domain objects (`collectionItemsFromSeed`, `decksFromSeed`, `gamesFromSeed`, `loansFromSeed`) |
| `src/data/mock/catalog.ts` | Lookup over `cards.json`; `catalog.require(name)` throws if a name is missing |

## Workflow
1. Edit the seed files. Use exact, real card names (Scryfall spelling and punctuation, e.g. `Kodama's Reach`).
   Double-faced cards can use the front-face name.
2. If you added a card name anywhere, regenerate the bundled data (needs network; uses the rate-limited client):
   ```
   npm run seed:cards
   ```
   It exits non-zero and lists names Scryfall couldn't find — fix the spelling and rerun. Commit `cards.json`
   (one card per line, so the diff stays readable).
3. Run `npx jest src/data/mock` — `seedIntegrity.test.ts` checks:
   - every seed deck is a legal 100-card Commander deck (`checkCommanderDeck`),
   - Atraxa 94 owned / 6 not owned / 2 in group; Krenko complete; Muldrotha 88/12; Edgar 95/5; 3 friend-fit cards,
   - binder totals **1,284 cards · 618 spare · 64 foils**,
   - 4 of 5 going; leaderboard Mira 7, Jonas 5, You 4, Erik 3, Sanna 2,
   - every Oracle chip that says "Spare in your binder" is in no deck, and "X has one" is owned by X.
4. If a number has to change on purpose, change it in **all three places together**: `docs/VISION.md`, the UI copy or
   canned answer that shows it, and the integrity test. Ask the user before changing numbers from the vision.

## Balancing tips
- Adding a card to a deck? Remove one (decks stay at 100), and either put it in `buildBinderSeed()` (owned) or in
  `NOT_OWNED` (and update the missing counts).
- Binder totals are tuned by `SPARES` (bulk and snow basics) and `DECK_CARD_COPIES` in `binder.ts` — change
  quantities there to rebalance. Every owned deck card gets one copy automatically.
- Friends' collections shouldn't contain your decks' missing cards, except the ones that are meant to be "friend has it".

## Reset
In the app: About → "Reset demo data" (`resetDemoData()` in `src/stores/bootstrap.ts`) clears the persisted stores
and reloads the seed. After changing the seed, reset (or clear the app's storage) to see it — mock mode keeps local
data once it has been seeded.

## Done when
- [ ] `cards.json` regenerated if names changed; no `catalog.require` throws.
- [ ] Seed integrity tests pass; VISION, UI copy and tests agree on every number.
- [ ] The `preflight` skill passes.
