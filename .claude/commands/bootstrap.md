---
description: Scaffold the Spellbinder React Native (Expo + Zustand) boilerplate from the vision
---

You are setting up the Spellbinder mobile app from scratch in this repository. Read `CLAUDE.md` and
`docs/VISION.md` fully before writing any code — they are the source of truth for stack, architecture, screens,
design tokens, data model and sample data. Don't ask clarifying questions unless you are truly blocked; make
sensible assumptions, note them, and keep going.

Extra instructions from me (may be empty): $ARGUMENTS

## Goal

A clean, well-structured boilerplate that **runs in Expo Go with mock data**, has every MVP screen from the vision
built to the design system, and has the Supabase, Scryfall, scan and Oracle layers in place behind adapters so
we can switch them on later.

## Steps

1. **Plan first.** Briefly list the folders, routes, stores and services you'll create, then proceed.

2. **Scaffold** an Expo app with TypeScript and Expo Router in the current directory using the latest
   `create-expo-app`. If it refuses because the folder isn't empty, scaffold into a temp folder and move the files
   in. Keep `CLAUDE.md`, `docs/` and `.claude/` intact. Remove the template's example screens and assets you don't use.
   Turn on TypeScript `strict` and add a `@/` path alias for `src/`.

3. **Install dependencies** with `npx expo install`: zustand, @react-native-async-storage/async-storage,
   @supabase/supabase-js, react-native-url-polyfill, expo-camera, expo-haptics, expo-blur, react-native-svg,
   expo-image, @expo-google-fonts/cinzel, @expo-google-fonts/manrope, expo-font, expo-splash-screen;
   dev: jest-expo, @testing-library/react-native, @types/jest. Add `test` and `typecheck` scripts.

4. **Design system** in `src/theme/`: tokens for colors, mana pip colors, color-identity tints, typography (Cinzel
   + Manrope styles), spacing and radii, exactly as in VISION.md §5. Load fonts in the root layout and hold the
   splash screen until they're ready.

5. **UI primitives** in `src/components/`: `Text` (variants: display, title, body, caption, eyebrow), `Button`
   (primary gold / secondary outline / ghost), `IconButton` (44 pt, required accessibilityLabel), `Chip`, `Pill`
   (owned / friend / missing / success variants), `ManaPips`, `SegmentedControl`, `ProgressBar`, `SectionHeader`,
   `Card` (surface panel), `CardImage` (Scryfall image with tinted placeholder + optional artist credit), `Avatar`,
   `Stepper`, `Sigil`, `Icon` (stroke icons via react-native-svg: home, decks, binder, group, scan, sparkle, search,
   back, close, flash, plus, check, chevron, import, share).

6. **Navigation** per VISION.md §3: `(tabs)` with a custom floating `TabBar` component (four tabs + raised center
   Scan button that pushes `/scan`), `scan` as a full-screen modal without the bar, `oracle` as a full-screen route,
   and `deck/[id]`, `card/[id]` detail routes. Add an `OracleButton` to each main screen header. Respect safe areas.

7. **Domain types** in `src/types/` (ScryfallCard subset, CollectionItem, Deck, DeckCard, DeckCategory, Profile,
   Playgroup, LoanRequest, GameNight, Rsvp, Game, OracleMessage, OracleAnswer).

8. **Data layer** in `src/data/`: repository interfaces (`CollectionRepo`, `DeckRepo`, `PlaygroupRepo`), mock
   implementations seeded with the sample data in VISION.md §8, and Supabase implementations (real queries, unused
   until `EXPO_PUBLIC_DATA_MODE=supabase`). A single `getRepos()` picks the implementation from the env var.

9. **Services** in `src/services/`:
   - `scryfall.ts` — shared client with a request queue enforcing ≥100 ms between calls, required headers,
     in-memory + AsyncStorage cache (24 h), and functions `autocomplete`, `search`, `getById`, `getNamedFuzzy`,
     `getCollection` (batches of 75), plus `getImageUri(card, size)` handling double-faced cards.
   - `supabase.ts` — client using AsyncStorage for the session and env vars for URL/anon key.
   - `scan.ts` — `recognizeCardName(imageUri)` adapter (mock rotates through sample card names; leave a clear TODO
     for on-device OCR in a dev build) and `identifyCard(imageUri)` that runs recognition then Scryfall fuzzy lookup.
   - `oracle.ts` — `askOracle(question)` adapter: mock returns the three canned answers from VISION.md §4 (plus the
     fallback reply); a stub `edgeOracle` calls `supabase.functions.invoke('oracle')`.

10. **Zustand stores** in `src/stores/`: `useSessionStore`, `useCollectionStore` (persisted), `useDeckStore`
    (persisted; selectors for ownership status per card: owned / friend / missing), `usePlaygroupStore`,
    `useScanStore` (mode, current match, foil, quantity, destination, session list, toast), `useOracleStore`
    (messages, busy, ask, reset).

11. **Screens** — build Home, Decks, Deck detail, Binder, Card detail, Scan, Playgroup and Oracle to match
    VISION.md §4 and §5 closely, wired to stores, with working filters, tabs, steppers, RSVP, lend/decline, the
    full scan flow (camera permission handling + capture → sheet → add → toast → session tray), and the Oracle chat
    with suggestion chips above the input. Show a sensible placeholder when camera permission is denied or in a simulator.

12. **Backend scaffolding** (don't run anything against a real project):
    - `supabase/migrations/0001_init.sql` with the tables, indexes and RLS policies from VISION.md §6.
    - `supabase/functions/oracle/index.ts` stub that reads `ANTHROPIC_API_KEY` from env, validates the caller's JWT,
      and has a TODO where the Claude API call and context-building go.
    - `.env.example` with `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_DATA_MODE=mock`.

13. **Settings/About** — a simple About screen (reachable from the avatar) with the Wizards of the Coast Fan Content
    Policy disclaimer and Scryfall attribution.

14. **Quality** — tests for the Scryfall rate limiter/cache, the deck ownership selectors, and the scan store flow.
    Make `npx tsc --noEmit`, `npx expo lint` and `npm test` pass. Write a `README.md` (setup, scripts, folder map,
    mock vs Supabase mode, what's stubbed). Initialize git and make an initial commit.

## Done when

- `npx expo start` runs and every screen is reachable in Expo Go using mock data.
- Typecheck, lint and tests pass.
- No secrets in the client; Scryfall access only goes through the rate-limited client.

Finish with a short report: what you built, assumptions you made, what's stubbed, and the 5 most sensible next steps.
