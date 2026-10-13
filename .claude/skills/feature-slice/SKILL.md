---
name: feature-slice
description: Add or extend a Spellbinder feature end to end through every layer — domain type, repository interface, mock + Supabase implementations, Zustand store action, selector/hook, components and a thin route. Use whenever a change needs new data, a new user action that persists, or a new screen backed by stores (e.g. "add wishlists", "let users rename decks", "add trade offers").
argument-hint: <feature description>
---

# Feature slice

Build `$ARGUMENTS` as a vertical slice that follows the architecture in `CLAUDE.md`. Read `CLAUDE.md` and the relevant
part of `docs/VISION.md` first. The data flow never changes:

```
app/ route (thin) → src/components → src/stores (Zustand) → src/data repositories → src/services (network)
```

Screens and components never call `fetch` or a service directly (ESLint enforces `fetch`; you enforce the rest).

## 0. Plan the slice
Write down, before you code: the new or changed domain types, repo methods, store actions, derived values, components
and routes. Reuse what already exists — check `src/utils/`, `src/stores/selectors/`, `src/components/ui/index.ts`.

## 1. Domain types — `src/types/domain.ts`
- camelCase fields, ISO-string dates, string-literal unions for statuses (see `LoanStatus`, `RsvpStatus`).
- **Card identity rule:** anything about a physical copy (collection) stores the `versionId` (Scryfall printing `id`) plus `cardId`;
  anything about a deck or "a card in general" (deck slots, loans, games, wishlists) stores **`cardId`** only.
  "Do I own this?" always joins on `cardId` (`src/stores/selectors/ownership.ts`). In Supabase every card reference is
  a foreign key to `cards` / `card_versions`, so a repo write must make sure the card is cached first (see `ensure` in
  `supabaseRepos.ts`).
- Re-export from `src/types/index.ts` if you add a file.

## 2. Repository contract — `src/data/repositories.ts`
- Add methods to an existing `*Repo` interface, or add a new interface and register it in `Repos`.
- Methods are async, take/return domain types (never rows), and are named after the intent (`requestLoan`, `setRsvp`).
- If the Group tab needs it at load, consider extending `PlaygroupSnapshot` instead of adding a round trip.

## 3. Mock implementation — `src/data/mock/mockRepos.ts`
- In-memory state seeded from `src/data/mock/seed/*` via `builders.ts`; `await latency()` on every call so loading
  states are visible (it's a no-op under `NODE_ENV=test`).
- Mock mode must work offline with zero backend. Need new seed data? Use the `seed-data` skill.

## 4. Supabase implementation — `src/data/supabase/`
- Row types in `mappers.ts` are aliases of the generated types (`type FooRow = Tables<'foo'>`; run `npm run db:types`
  after the migration is pushed); never hand-write a row. Add `toX` / `fromX` mappers (snake_case ↔ camelCase, `null` ↔
  `undefined`); write mappers return `TablesInsert<'foo'>`, and jsonb payloads are `type` aliases read with `fromJson`.
- Query through `getSupabase()` in `supabaseRepos.ts`; wrap every result in `check(...)`; `chunk()` long `in (...)` lists.
- Rely on RLS for authorization — don't filter "for security" in the client, filter for intent.
- If the table or column doesn't exist yet, add it first in `../spellbinder-db` (its `supabase-migration` skill), then regenerate types.

## 5. Store — `src/stores/use<Domain>Store.ts`
One store per domain (`collection`, `decks`, `playgroup`, `scan`, `oracle`, `session`, plus the `cards` cache).
Copy the pattern from `useCollectionStore.ts`:
- Get repos with `getRepos()` (from `@/data`) at call time, never at import time (so tests can `setRepos`).
- **Optimistic update, then write through:** `set(...)` locally, `await getRepos().x.y(...)`, and on failure
  `set({ error: messageOf(error) })` (`@/utils/errors`).
- Guard on the signed-in user (`useSessionStore.getState().user?.id`).
- New ids come from `createId()` (`@/utils/id`).
- Mock mode treats local data as the truth after the first load (`seeded` flag); Supabase mode always refreshes.
- Persisting? Add a key to `STORE_KEYS` in `src/stores/storage.ts`, use `persistStorage`, set `version`, and
  `partialize` only raw data (no `loading` / `error`). Bump `version` (and add `migrate`) when the persisted shape changes.
  Register the store in `persistedStores` in `src/stores/bootstrap.ts` and load it in `bootstrapApp()` when needed.
  Also make sure `resetDemoData()` resets it.
- Keep state raw. **No duplicated or derived state in stores.**

## 6. Derived values — `src/stores/selectors/` + `src/stores/hooks.ts`
- Pure functions in `selectors/*.ts` (no React, no store imports) — easy to unit test.
- Hooks in `hooks.ts` select raw slices and derive with `useMemo`. Never return a fresh array or object from a
  zustand selector (it re-renders forever) — select the raw slice, then derive.

## 7. UI
- Components in `src/components/<area>/` built from the primitives — follow the `ui-component` skill.
- Routes in `app/` stay thin: read stores and hooks, compose components, handle navigation. No business logic.
  New route? Register it in `app/_layout.tsx` (stack) or `app/(tabs)/_layout.tsx`, and keep the VISION nav rules
  (Scan = full-screen modal without the bar, Oracle = full-screen route, detail routes keep the bar).

## 8. Tests — follow the `write-tests` skill
At minimum: selector unit tests and one store-flow test with fake repos. Add a component test for new interactive UI.

## Monorepo note
The website will share the Supabase backend and probably these types, mappers and selectors. Keep `src/types`,
`src/stores/selectors`, `src/utils` and `src/data/supabase/mappers.ts` free of React Native imports so they can move
into a shared package later (`src/services/scryfallClient.ts` already follows this rule).

## Done when
- [ ] Works in mock mode in Expo Go with no backend; Supabase implementation written against real columns.
- [ ] Both repo implementations satisfy the interface (typecheck proves it).
- [ ] No derived state in stores; no `fetch`/services in `app/` or `src/components/`.
- [ ] Tests added; the `preflight` skill passes.
