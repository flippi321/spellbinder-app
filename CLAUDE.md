# Spellbinder — project memory for Claude Code

Spellbinder is a free, non-commercial Magic: The Gathering **Commander** companion app for a small group of friends:
collection tracking, deckbuilding, a playgroup layer (lending, game nights, "who has it?"), card scanning,
and an AI deck advisor called the **Oracle**. The full product and design vision lives in the file below — read
it before making product or UI decisions.

@docs/VISION.md

## Stack (decided — don't swap without asking)

- **Expo (managed workflow) + React Native + TypeScript (strict)**, using the latest stable Expo SDK.
- **Expo Router** for navigation (file-based routes in `app/`).
- **Zustand** for client state (with `persist` + AsyncStorage for anything that should survive restarts).
- **Supabase** (Postgres + Auth + Row Level Security + Edge Functions) as the backend. The backend (migrations, RLS,
  Edge Functions, its own CLAUDE.md and skills) lives in the sibling repo **`../spellbinder-db`**, shared with the
  website. This repo holds no SQL; it consumes the schema through generated types. Auth is email + password.
  `spellbinder-db` is linked to the **live** hosted project `fobbpfvhnelpforjqugd`, and migrations are pushed there.
  `EXPO_PUBLIC_DATA_MODE=supabase` runs the app against that project (README → Data modes), so treat it as real data.
- **Scryfall API** for all card data and images. We never host card images ourselves.
- Fonts: **Cinzel** (display) and **Manrope** (UI/body) via `@expo-google-fonts/*`.
- Icons: inline stroke icons with `react-native-svg` (no emoji, no icon fonts with brand marks).
- Tests: `jest-expo` + `@testing-library/react-native`.

Always add Expo-compatible packages with `npx expo install <pkg>` so versions match the SDK.
The app must keep running in **Expo Go** until we deliberately move to a dev build (no custom native modules yet).

## Commands

- Start: `npx expo start`
- Typecheck: `npx tsc --noEmit`
- Lint: `npx expo lint`
- Test: `npm test`
- Database types: `npm run db:types` after a migration reaches the remote (writes `src/types/database.ts`, never edit
  it by hand); `npm run db:types:check` tells you if it's stale. Needs `../spellbinder-db` linked and logged in.

Run typecheck, lint and tests before saying a task is done.

## Working alongside other agents

Several agents may work on this repo and `../spellbinder-db` at the same time. The work list is `docs/TODO.md`;
who is doing what is in **`WORKLOG.md` in the folder that holds both repos** (`C:\Users\chrbre\Spellbinder\WORKLOG.md`).
- Before starting a TODO item, read `WORKLOG.md`, follow its rules, and claim the item with the files you'll touch.
- Work in your own git worktree on a branch named after the item ID. Never in the main checkout while others run.
- When done, update your row and tick only your own item's boxes in `docs/TODO.md`. Don't merge to `main`.

## Skills (`.claude/skills/`)

Use the matching skill instead of improvising; each one ends with a "Done when" checklist.

- `feature-slice` — new data or persisted actions end to end: type → repo (mock + Supabase) → store → selector → UI.
- `ui-component` — screens and components built to the design system, tokens and accessibility rules.
- `scryfall` — anything that fetches, stores or shows card data or images.
- `seed-data` — mock seed changes, `npm run seed:cards`, keeping the vision's numbers true.
- `write-tests` — test patterns (fake repos, RTL v14, fake clock).
- `preflight` — the definition of done: tooling plus a hard-rule audit. Run it before reporting any task as finished.
- `vision-review` — check a screen against `docs/VISION.md`.

Schema changes (`supabase-migration`) and the Oracle Edge Function (`oracle-edge`) have their skills in `../spellbinder-db`.

## Architecture rules

- `app/` contains routes only — thin screens that compose components and read from stores.
- `src/components/` reusable UI; `src/theme/` design tokens; `src/stores/` Zustand stores;
  `src/services/` external APIs (Scryfall, Supabase, Oracle, scan); `src/data/` repositories + mock seed data;
  `src/types/` domain types; `src/utils/` pure helpers.
- Screens never call `fetch` directly. Stores call **repositories**; repositories call **services**.
- Every repository has an interface plus a **mock** implementation (seed data) and a **Supabase** implementation.
  `EXPO_PUBLIC_DATA_MODE=mock|supabase` picks one. Default is `mock` so the app works with zero backend setup.
- One Zustand store per domain (`collection`, `decks`, `playgroup`, `scan`, `oracle`, `session`). Keep stores small;
  derive values with selectors, not duplicated state.
- All colors, spacing, radii and font styles come from `src/theme`. No hard-coded hex values in components.

## Hard rules

- **Never put the Claude/Anthropic API key (or any secret) in the app.** The Oracle calls a Supabase Edge Function;
  the key lives in Supabase secrets. Only `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` go in the client.
- **Scryfall etiquette:** 50–100 ms between requests (use the shared rate-limited client), cache responses,
  use bulk data for large imports, and include the request headers Scryfall's docs ask for
  (https://scryfall.com/docs/api). Never crop, distort or watermark card images; when showing `art_crop`, show the
  artist name nearby.
- Keep the app free and non-commercial, and show Wizards of the Coast's Fan Content Policy disclaimer in Settings/About.
- Store collection items by **`versionId`** (Scryfall's printing `id`) plus `cardId`; store deck cards, loans and games by
  **`cardId`** (Scryfall's `oracle_id`, read with `getCardId(card)`). "Do I own this?" joins on `cardId`.
- Accessibility: touch targets ≥ 44 pt, `accessibilityLabel` on icon-only buttons, text contrast ≥ 4.5:1.
