# Spellbinder

A simple MTG Companion app for me and my friends.

Spellbinder is a free, non-commercial **Magic: The Gathering Commander** companion: collection tracking,
deckbuilding, a playgroup layer (lending, game nights, "who has it?"), card scanning, and an AI deck advisor
called the **Oracle**. Its edge: it knows what you *and your friends* actually own. Product and design vision:
[docs/VISION.md](docs/VISION.md). Working rules for contributors (and Claude Code): [CLAUDE.md](CLAUDE.md).

Built with Expo SDK 57 (React Native 0.86, React 19, TypeScript 6), Expo Router, Zustand and Supabase, with card
data from [Scryfall](https://scryfall.com).

## Quick start

Requirements: Node 22+ (developed on Node 24) and the **Expo Go** app (SDK 57) on your phone.

```bash
npm install
npx expo start        # scan the QR code with Expo Go (Android) or the Camera app (iOS)
```

That's it — the app starts in **mock mode** with sample data, so no backend or keys are needed. Card images load
from Scryfall when you're online and fall back to tinted placeholders offline.

## Scripts

| Command | What it does |
|---|---|
| `npm start` / `npx expo start` | Dev server (Expo Go, simulators, `w` for web preview) |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | `expo lint` — includes guardrails: no hard-coded colors in UI code, no `fetch` outside `src/services` |
| `npm test` | Jest (`jest-expo` + React Native Testing Library) |
| `npm run seed:cards` | Re-resolve the mock seed's card names against Scryfall → `src/data/mock/cards.json` |

Run typecheck, lint and tests before calling a change done.

## What's in the app

- **Home** — game-night strip, "at a glance" tiles, your decks.
- **Decks** — filters (All / Need cards / Complete), new deck from a commander search; **deck detail** with art hero,
  category accordion showing owned / "Jonas has it" / missing, and stats (mana curve, ownership, types).
- **Binder** — 1,284-card sample collection with search, color and type filters; **card detail** with quantity
  stepper, decks, friends who own it, other printings, add to deck.
- **Scan** — camera viewfinder → recognition → Scryfall match → foil/quantity → add to binder or a deck, with a
  session tray. Works in simulators/denied-permission too (the shutter runs mock recognition).
- **Group** — members, game night + RSVP, wins leaderboard, log a game, lending (lend/decline), "Who has it?" + ask.
- **Oracle** — chat with three suggested prompts and canned answers (preview); its action buttons really apply
  swaps, start a deck or send a borrow request.
- **About** (tap your avatar) — Fan Content Policy statement, Scryfall attribution, data mode, reset demo data.

## Project layout

```
app/                      Expo Router routes only — thin screens
  (tabs)/                 Home, Decks, Binder, Group + the floating tab bar
  deck/[id].tsx, card/[id].tsx, scan.tsx, oracle.tsx, about.tsx
src/
  theme/                  design tokens (colors, type, spacing) — the only place colors live
  components/ui/          primitives: Text, Button, IconButton, Chip, Pill, ManaPips, CardImage, Sheet, …
  components/<feature>/   home, decks, binder, card, scan, playgroup, oracle, search, navigation
  stores/                 Zustand stores (session, cards, collection, decks, playgroup, scan, oracle)
  stores/selectors/       pure derivations: ownership, binder totals/filters, playgroup views
  data/                   repository interfaces + mock (seed) and Supabase implementations; getRepos()
  services/               Scryfall client, Supabase client, scan + Oracle adapters
  types/                  Scryfall subset, domain types, Oracle types
  utils/                  pure helpers (formatting, card helpers, deck stats, legality)
scripts/build-seed-cards.ts
```

The backend (schema, RLS, Edge Functions such as the Oracle) lives in the separate **`spellbinder-db`** repo.

Data flow: **screens → stores → repositories → services**. Screens select raw store state and derive views with the
pure selectors in `src/stores/selectors` (memoized), so there's no duplicated state.

## Data modes

Copy `.env.example` to `.env` (gitignored). Only `EXPO_PUBLIC_*` values reach the app, so never put secrets there.

| Variable | Values | Default |
|---|---|---|
| `EXPO_PUBLIC_DATA_MODE` | `mock` · `supabase` | `mock` |
| `EXPO_PUBLIC_ORACLE_MODE` | `mock` (canned answers) · `edge` (Edge Function) | `mock` |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | your project's values | — |

**Mock mode.** The seed in `src/data/mock/seed/` lists cards **by name** (four 100-card decks, your binder, friends'
collections, game night, games, loans). `cards.json` holds the real Scryfall ids for those names, so seed decks
(stored by `oracle_id`) and scanned cards (stored by printing `id`) join correctly. The first launch copies the seed
into persisted stores; after that your changes stay on the device until **About → Reset demo data**. After editing
the seed, run `npm run seed:cards`. A seed-integrity test keeps the numbers from the vision true (94% Atraxa,
1,284 cards · 618 spare · 64 foils, …).

**Supabase mode.**
1. The backend is the **live** hosted Supabase project `fobbpfvhnelpforjqugd`. Its schema is managed in the
   `spellbinder-db` repo and pushed from there (see its README).
2. Set `EXPO_PUBLIC_SUPABASE_URL=https://fobbpfvhnelpforjqugd.supabase.co`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the
   project's **publishable** key, `sb_publishable_…`) and `EXPO_PUBLIC_DATA_MODE=supabase`, then restart with
   `npx expo start -c` (the values are baked into the bundle). To use the local stack in `spellbinder-db` instead,
   use `http://<your LAN IP>:54321` and the local key from `npx supabase status`.
3. Signed out, the app shows the sign-in screen: email + password, "Create account" and "Forgot password?".
   Accounts made there are real accounts on the live project.
4. Oracle: deploy the `oracle` function from `spellbinder-db`, then set `EXPO_PUBLIC_ORACLE_MODE=edge`.

## Scryfall etiquette

All Scryfall traffic goes through one client (`src/services/scryfallClient.ts`), which follows
[the API docs](https://scryfall.com/docs/api) as of Oct 2026:

- sends `User-Agent: Spellbinder/<version>` and an `Accept` header on every request (browsers keep their own UA);
- a serial queue spaces requests ≥ 100 ms apart, and ≥ 500 ms for `/cards/search`, `/cards/named`, `/cards/random`
  and `/cards/collection` (their limit is 2 requests/second);
- after an HTTP 429 the whole queue pauses for 30 s (Scryfall locks you out that long);
- responses are cached in memory and AsyncStorage for 24 h; identical in-flight requests are shared;
- batch lookups use `/cards/collection` (75 per request); big imports should use bulk data instead.

Images come straight from Scryfall's CDN and are never cropped, tinted or watermarked. Full cards use `contain`;
wherever an `art_crop` is shown, the artist and © Wizards of the Coast are credited next to it.

## What's stubbed

| Area | Now | Later |
|---|---|---|
| Card recognition | `recognizeCardName()` rotates sample names | on-device OCR in a dev build (TODO in `src/services/scan.ts`) |
| Oracle | canned answers to three prompts | Edge Function building deck/collection context + Claude API (TODOs in `spellbinder-db`'s `supabase/functions/oracle`) |
| Auth | demo profile in mock mode | email + password screen + playgroup onboarding |
| Imports | add cards one at a time | CSV / text-list import, Scryfall bulk data |
| Polish | mana symbols drawn as letter pips; template icon/splash images | official symbol SVGs, Spellbinder icon art |

## Testing in Expo Go

1. Home: game night shows "4 of 5 going"; tiles show 1,284 cards and 3 friend-owned cards.
2. Decks → Atraxa: categories show gold checks, "Jonas has it" and "Missing"; Stats shows the mana curve.
3. Tap a tab on deck detail — you land on that tab.
4. Scan (gold button): allow the camera, tap the shutter, toggle Foil, add — the toast and tray update and Binder
   shows +1.
5. Group → Lending: lend Rhystic Study to Jonas; Who has it → "Mothman" → Ask.
6. Oracle (sparkle button): tap a suggestion; try "Start a Mothman deck".

## Legal

Spellbinder is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards.
Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC. Card data and
images are provided by Scryfall; Spellbinder is not produced by or endorsed by Scryfall. Free forever, never
monetized.
