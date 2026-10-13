# Spellbinder — TODO: from mock to real

This is the work list for turning the mock-data boilerplate into a real app. It sits next to
[VISION.md](VISION.md) (what we're building) and [CLAUDE.md](../CLAUDE.md) (how we build it).

**How to use it**
- Every item has an ID (`SB-3`), a priority, its dependencies, numbered steps and a **Done when** list. Tick the
  checkboxes as you go, and reference the ID in commit messages.
- **P0** = needed for the app to work with real data. **P1** = needed before friends use it daily. **P2** = polish/later.
- Use the matching skill from `.claude/skills/` for each item (noted as *Skill:*). Every item finishes with the
  `preflight` skill (typecheck, lint, tests and the hard-rule audit).
- The mock mode (`EXPO_PUBLIC_DATA_MODE=mock`) must keep working throughout. Every repo change gets a mock twin.
- **Running several agents?** Claim the item in `WORKLOG.md` (in the folder that holds both repos) before starting,
  and work in your own worktree. When you finish, tick only your own item's boxes here.
- Database work (migrations, RLS, SQL tests, seed, Edge Functions) happens in `../spellbinder-db`. Paths like
  `supabase/…` below are in that repo.

---

## Where things stand (Oct 2026)

| Area | Real today | Still mock / missing |
|---|---|---|
| Supabase | Backend in its own repo `spellbinder-db`: `0001_init.sql` with RLS, RPCs, loan rules, realtime publication, pgTAP tests, local seed. Client (`src/services/supabase.ts`), full Supabase repos, mappers | Hand-written row types, password sign-in not wired (repo still has OTP), no sign-in UI, no onboarding, no realtime subscriptions, persisted stores aren't scoped per user |
| Card data | Rate-limited Scryfall client with 24 h response cache, `cards` table as a shared cache filled on demand | No bulk sync, every user can write the shared `cards` table, search/autocomplete always hit Scryfall, device card cache never expires and has no size cap |
| Home | Binder count, friend-fit count, game night, deck tiles are all derived from stores | The two Oracle tiles are hard-coded (`ORACLE_TEASERS`), no loading/empty/error states, no pull-to-refresh |
| Decks | List + filters, detail, ownership, mana curve, type breakdown, basic legality | No rename/delete/edit, no category editing, no import/export, stats are thin (no colors, targets, brackets, prices) |
| Binder | Search, W U B R G C filter, single-select type chips, totals | Filters silently drop cards whose data isn't loaded, no sort, no combined filters, no advanced filters, no import, can't edit foil/condition/printing |
| Scanner | Camera, viewfinder, sheet, tray, add to binder/deck, printings, "Type it" | `recognizeCardName()` ignores the photo and rotates sample names |
| Playgroup | RSVP, lend/decline, ask, log a game (winner only), leaderboard, invite share | Can't plan a game night, no returns, no join flow, no realtime |
| Oracle | Chat UI, canned answers, actions | Edge Function is a stub (`supabase/functions/oracle`) |

---

## Milestones (suggested order)

```
M1  Backend foundation    SB-1 → SB-2 → SB-3 → SB-4 → SB-5 → SB-6 → SB-7 → SB-8 → SB-9
M2  Card cache + sync     CC-1 → CC-2 → CC-3 → CC-4 → CC-5 → CC-6 → CC-7          (needs SB-2, SB-4)
M3  Real screens          HM-*, BN-*, DK-*                                       (needs M1; BN/DK filters & stats need M2)
M4  Card scanner          SC-1 → SC-2 → SC-3 → SC-4 → SC-5 → SC-6                (needs CC-4 for set+number lookup)
M5  Playgroup + Oracle    PG-*, OR-*                                             (needs M1)
M6  Ship to friends       X-*                                                    (anytime; X-1 early)
```

---

## 0. Decisions to make first

These change what gets built. Each has a recommendation; record the decision here when it's made.

- [ ] **D-1 Where does the 24 h card sync run?**
  - *Recommended:* a **GitHub Actions** scheduled workflow running a Node script (`scripts/sync-cards.ts`) with the
    service-role key in GitHub secrets. The repo is already on GitHub, there are no memory or time limits, and it can
    reuse `slimCard` and the Scryfall client.
  - *Alternative:* a Supabase Edge Function triggered by `pg_cron` + `pg_net`. Everything stays in Supabase, but Edge
    Functions have tight memory and wall-clock limits, so the bulk file must be stream-parsed and the upsert split
    across several invocations.
- [ ] **D-2 Which bulk file?** *Recommended:* `default_cards` (every printing, in English where it exists). Scanning,
  "Change printing" and collection items all need printings. `oracle_cards` (one row per card) is much smaller but
  doesn't have every printing. Filter out `digital: true` rows either way.
- [ ] **D-3 How does the scanner recognize cards?**
  - *Recommended first step:* **cloud recognition**. A Supabase Edge Function `scan` sends the photo to Claude
    (vision) and gets back name + set code + collector number. Keeps Expo Go, reads the printing too, works on foils
    and non-English cards. Costs a little per scan and needs a connection.
  - *Later:* on-device OCR (ML Kit / Apple Vision). Fast, offline and free, but needs a **development build** (leaves
    Expo Go, per CLAUDE.md that's a deliberate decision) and only reads the name reliably.
- [x] **D-4 Prices?** *Decided:* yes, informational only (keeps the app non-commercial). Migration `0005_card_prices.sql`:
  current prices per version in `card_prices` (Scryfall's usd/eur/tix keys, by finish), a daily `card_price_history`
  for owned versions (weekly after 90 days), and the `collection_item_prices` view. Shown later as "≈ €12 to complete".
  The daily sync (CC-2) writes them.
- [ ] **D-5 What counts as "spare"?** Today a card is spare only if it's in **no** deck (seed-integrity test pins
  618). Alternative: copies beyond what your decks use (3 Sol Rings, 2 decks → 1 spare). Pick one, then update
  `binderTotals`, the seed test and VISION if it changes.
- [x] **D-6 Sign-in method.** *Decided:* **email + password**, email confirmations off, and the project sends no email
  (no SMTP). `SessionRepo`'s OTP methods get replaced in SB-6. Apple/Google sign-in can come later.

---

## 1. Supabase connection & databases (SB)

> **SB-1, SB-2 and the SQL half of SB-11 are done in the `spellbinder-db` repo** (CLI, `config.toml`, local stack on
> Podman, reviewed migrations `0001_init.sql` + `0002_private_helpers.sql`, 29 pgTAP tests). What's left here: SB-1
> step 5 (`.env` with URL + publishable key).
>
> **Already in the database, not yet used by the app:** the `create_playgroup` / `join_playgroup` RPCs (SB-7), the
> requester-cancels-pending delete policy and the `lent → returned` rule (SB-8 step 6, PG-2), and the Realtime
> publication for `game_nights`, `rsvps`, `games`, `loan_requests` (SB-10 step 4).

### SB-1 · Create the Supabase project and CLI setup — P0
*Skill:* `supabase-migration` · *Depends on:* —
*Status:* done in `spellbinder-db` except step 5.
1. ~~Create a Supabase project~~ Done: ref `fobbpfvhnelpforjqugd`.
2. ~~Add the Supabase CLI and `config.toml`~~ Done, in `spellbinder-db`.
3. ~~Local development~~ Done: `npm run db:start` in `spellbinder-db` (Podman, see its README).
4. ~~`npx supabase link`~~ Done (documented in `spellbinder-db` README).
5. Copy `.env.example` → `.env` with the project URL + **publishable** key. Never the service-role key.
6. ~~npm scripts~~ Done in `spellbinder-db` (`db:start`, `db:reset`, `types`, `functions:serve`).
7. Document in this README → "Supabase mode": point to `spellbinder-db` and list the `.env` values.

**Done when**
- [x] `supabase/config.toml` committed (in `spellbinder-db`); local stack starts; README explains the steps.
- [ ] `.env` is gitignored and contains only `EXPO_PUBLIC_*` values.

### SB-2 · Review and apply `0001_init.sql` — P0
*Skill:* `supabase-migration` · *Depends on:* SB-1
*Status:* done (see the note above). Remote state can be checked with `npx supabase migration list` in `spellbinder-db`.
1. Read `supabase/migrations/0001_init.sql` end to end against VISION §6 and the `*Row` types in
   `src/data/supabase/mappers.ts`.
2. Run it locally with `npx supabase db reset` and fix anything that fails. Don't edit the file once it's been
   applied remotely. After that, fixes go in new migrations.
3. Smoke-test RLS locally with two test users: A can't read B's collection until they share a playgroup; after
   `join_playgroup` A can read but not write B's rows; loans are visible only to the two parties.
4. Check the `handle_new_user` trigger creates a profile on sign-up.
5. Ask before running `npx supabase db push` to the remote project, then run it.

**Done when**
- [x] Migration applies cleanly locally and remotely.
- [x] The RLS smoke tests above pass (`spellbinder-db/supabase/tests/rls.test.sql`; see SB-11).

### SB-3 · Generated database types — P0
*Depends on:* SB-2
1. Add `"db:types": "supabase gen types typescript --local > src/types/database.ts"` (or `--linked`).
2. Create the client as `createClient<Database>(…)` in `src/services/supabase.ts`.
3. Replace the hand-written `*Row` interfaces in `mappers.ts` with `Tables<'cards'>` etc. and remove the `TODO` there.
4. Remove the `as XRow[]` casts in `supabaseRepos.ts` that typed queries make unnecessary.
5. Add a CI check that regenerated types match the committed file (X-3).

**Done when**
- [ ] `npm run typecheck` passes with generated types; no hand-written row types left.

### SB-4 · Migration `0006_cards_sync.sql`: extend and lock down the card cache — P0
*Skill:* `supabase-migration` · *Depends on:* SB-2, D-1, D-2, D-4
The cache is two tables since 0003: `cards` (rules, pk = Scryfall oracle_id) and `card_versions` (printings, pk =
Scryfall id, already has `finishes card_finish[]`). Prices live in `card_prices` (0005), not on the cards.
1. Add the columns the features below need (all nullable/defaulted = backward compatible):
   - `card_versions`: `released_at date`, `set_name text`, `lang text`, `digital boolean`, `scryfall_updated_at timestamptz`.
   - `cards`: `game_changer boolean` (Commander Brackets), `produced_mana text[]` (ramp/land stats), `keywords text[]`,
     `edhrec_rank int`.
2. Indexes: `create extension pg_trgm` + GIN trigram index on `cards.name` (autocomplete and fuzzy match); unique index
   on `card_versions (set, collector_number, lang)` (scanner lookup); index on `card_versions.card_id` (exists).
3. **Tighten RLS:** once the sync fills the tables, drop the `cards` / `card_versions` insert and refresh policies so
   only the service role (the sync job) writes. Any signed-in user can currently overwrite shared card rows. Keep the
   client upsert as a fallback only until CC-3 has run once, then remove `CardRepo.save()` writes in Supabase mode.
4. New table `card_sync_runs` (id, started_at, finished_at, bulk_updated_at, rows_upserted, status, error) with RLS
   read for authenticated users, so the app can show "Card data updated 3 h ago" in About.
5. SQL functions (security invoker, `stable`):
   - `search_card_names(q text, lim int)`: prefix + trigram match on distinct names, for autocomplete.
   - `find_card(name text)`: exact, then case-insensitive, then best trigram match above a similarity threshold, for
     scanner and typed names.
   - `card_versions_of(card uuid)`: a card's versions, newest first.
6. Update `CardRow` / `CardVersionRow`, the mappers and `slimCard` with the new fields (`set_name` is already in the TS
   type, but not in the tables).

**Done when**
- [ ] Migration applies on top of 0005; new fields round-trip through `toCard`/`fromCard`.
- [ ] A client JWT can no longer insert/update `cards` or `card_versions` (verified by an SQL test).

### SB-5 · Local seed data for Supabase — P1
*Skill:* `seed-data` · *Depends on:* SB-2
*Status:* step 1 done in `spellbinder-db/supabase/seed.sql` (password `spellbinder-dev`). Steps 2 and 3 are open: no
collections, decks or `cards` are seeded yet.
1. `supabase/seed.sql`: five auth users (You, Jonas, Mira, Erik, Sanna), profiles, "The Thursday Table", a game night,
   RSVPs, 21 games, the loans from VISION §8.
2. Generate the collection and deck rows from the existing mock seed (`src/data/mock/seed/`) with a small script, so
   the vision's numbers (94 % Atraxa, 1,284 cards…) are the same in both modes.
3. Seed `cards` from `src/data/mock/cards.json` so the local DB works without running the bulk sync.

**Done when**
- [ ] `npx supabase db reset` gives a local DB where signing in as "You" shows the same Home as mock mode.

### SB-6 · Authentication: sign-in screen and auth gate — P0
*Skills:* `feature-slice`, `ui-component` · *Depends on:* SB-2
1. Route `app/sign-in.tsx`: email + password with "Sign in" / "Create account" (and display name on sign-up). Replace
   `SessionRepo.signInWithOtp` / `verifyOtp` with `signIn(email, password)` → `signInWithPassword` and
   `signUp(email, password, displayName)` → `signUp({ options: { data: { display_name } } })` (the DB trigger reads
   `display_name` for the profile). Sign-up returns a session immediately (no confirmation email). Show error messages
   and a loading state. Use the design system (Cinzel title, gold primary button). Minimum password length is 8.
2. Password reset needs email, which the project doesn't send. For now, reset by hand in the Supabase dashboard.
   **Check first:** `spellbinder-db`'s README and `config.toml` describe Gmail SMTP plus a password-reset code
   template (`templates/recovery.html`), which contradicts D-6. If SMTP is live on the remote project, build
   "Forgot password?" → code → new password (`resetPasswordForEmail` + `verifyOtp({ type: 'recovery' })`) instead,
   and fix D-6 and `spellbinder-db/CLAUDE.md`.
3. Auth gate in `app/_layout.tsx`: when `useSessionStore.status === 'signedOut'` in Supabase mode, redirect to
   `/sign-in` (Expo Router `Redirect` or a protected group). Mock mode never shows it.
4. Subscribe to `supabase.auth.onAuthStateChange` in `SessionRepo` / `useSessionStore` so token refresh, sign-out on
   another device and expired sessions update the store.
5. "Sign out" button in About (Supabase mode only). It calls `signOut()` and then X-1's store reset.
6. Profile editing in About: display name, initials, avatar color (needs `SessionRepo.updateProfile`, mock + Supabase).

**Done when**
- [ ] Fresh install in Supabase mode → create account → Home with your (empty) data.
- [ ] Sign out returns to sign-in and no previous user's data is visible (see X-1).
- [ ] Store tests cover sign-in success, wrong password and sign-out.

### SB-7 · Onboarding: create or join a playgroup — P0
*Skills:* `feature-slice`, `ui-component` · *Depends on:* SB-6
*Status:* the database side is done (both RPCs, owner role, the `members: leave` policy, tests). Only app work is left.
1. Add `PlaygroupRepo.create(name)` → `rpc('create_playgroup')`, `PlaygroupRepo.join(code)` → `rpc('join_playgroup')`,
   `PlaygroupRepo.leave(playgroupId)`. Add mock versions.
2. After the first sign-in, show onboarding: (a) confirm display name, (b) "Create a playgroup" or "Join with a code".
3. Group tab: when `status === 'none'`, show the same two actions instead of the plain text.
4. Invite deep link `spellbinder://join/<CODE>` (scheme in `app.json`). It opens the join flow with the code filled in.
   Include it in the existing Share message.

**Done when**
- [ ] Two real accounts can create + join a group and then see each other in the Group tab.

### SB-8 · Fill the repository gaps — P0
*Skill:* `feature-slice` · *Depends on:* SB-2
These are mock-only actions or missing actions that the screens below need. Each needs interface + mock + Supabase + store action.
1. `DeckRepo.update(deckId, { name, theme, bracket, partnerOracleId })` and `DeckRepo.remove(deckId)`.
2. `DeckRepo.updateCard` for category and quantity changes (`upsertCard` may already cover this; confirm and test).
3. `CollectionRepo.update` for foil, condition and printing changes (watch the `unique (user_id, scryfall_id, foil,
   condition)` constraint: changing foil can merge two stacks).
4. `CollectionRepo.bulkUpsert(items)` for imports (BN-8) and scan sessions. One request per ~500 rows.
5. `PlaygroupRepo.createGameNight` / `updateGameNight` / `deleteGameNight`.
6. `PlaygroupRepo.updateLoan` already exists. Add `cancelLoan` (requester deletes a pending request) and use
   `status: 'returned'`.
7. `PlaygroupRepo.logGame` with full details (see PG-3).

**Done when**
- [ ] Every new method exists in both repos with a test against the mock repo.

### SB-9 · Reliable writes: rollback, retry, errors you can see — P1
*Depends on:* SB-8
1. Stores apply changes optimistically, but on failure they only set `error`, so the UI keeps showing a change that
   never saved. Snapshot the previous state and roll back on failure (collection, decks, playgroup stores).
2. Show store errors to the user: a shared error toast (`Toast` component exists) subscribed to store `error` fields.
3. Retry once on network errors. Treat RLS/constraint errors as final and show a clear message.
4. Optional (P2): offline write queue persisted in AsyncStorage, replayed on reconnect (`@react-native-community/netinfo`).

**Done when**
- [ ] Simulated failure (airplane mode) → change is undone and a toast explains why. Covered by store tests with a failing fake repo.

### SB-10 · Live updates and refresh — P1
*Depends on:* SB-6
1. Supabase Realtime channels for `loan_requests`, `rsvps`, `games`, `game_nights` (filtered to your playgroup), so a
   friend's RSVP or borrow request shows up without reloading.
2. Refresh `bootstrapApp()` data when the app returns to the foreground (`AppState`), at most every few minutes.
3. Pull-to-refresh (`RefreshControl`) on Home, Decks, Binder and Group.
4. ~~Enable Realtime for those tables in a migration~~ Done in `0001_init.sql`.

**Done when**
- [ ] Two devices: an RSVP or a loan request on one appears on the other within seconds.

### SB-11 · Backend tests — P1
*Skill:* `write-tests` · *Depends on:* SB-2
*Status:* step 1 done except the `cards` write lockdown, which gets its test with SB-4. Steps 2 and 3 are open.
1. SQL tests (pgTAP via `npx supabase test db`) for every RLS policy in VISION §6: own-row writes only, peer reads,
   loan visibility, the `cards` write lockdown.
2. Mapper round-trip tests (`toX(fromX(x)) === x`) for every table.
3. Edge Function tests (Deno) for `oracle` and `scan` input validation and auth.

**Done when**
- [ ] `npx supabase test db` and `npm test` both pass in CI.

---

## 2. Card cache: sync all cards every 24 h (CC)

**Target design:** a scheduled job pulls Scryfall's bulk data once a day and upserts it into `cards`. The app then
answers lookups, autocomplete and printings **from Supabase first**, and only falls back to the Scryfall API for
things the table doesn't have yet. On the device, `useCardStore` keeps the cards you actually use and refreshes them
when they're older than 24 h. This cuts Scryfall API traffic to almost nothing (good etiquette) and makes the app faster.

### CC-1 · Add bulk-data support to the Scryfall client — P0
*Skill:* `scryfall` · *Depends on:* D-1, D-2
1. Add `getBulkDataList()` (`GET /bulk-data`) to `createScryfallClient` so it uses the shared queue and headers.
   Add a test with the fake clock.
2. The bulk **file** itself is served from `data.scryfall.io` (not rate limited). Download it with a streaming request,
   not the cached JSON helper (it's far too large for memory/AsyncStorage).

**Done when**
- [ ] `getBulkDataList()` is tested and returns the `default_cards` entry with `download_uri` and `updated_at`.

### CC-2 · The sync script — P0
*Skill:* `scryfall` · *Depends on:* CC-1, SB-4
`scripts/sync-cards.ts` (Node, run with `tsx`, reads `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from env):
1. Read the latest `card_sync_runs` row. If `bulk_updated_at` equals Scryfall's `updated_at`, exit early: nothing new.
2. Insert a `card_sync_runs` row with status `running`.
3. Stream-download `download_uri` and stream-parse the JSON array (e.g. `stream-json`). Never `JSON.parse` the whole file.
4. For each card: skip `digital: true`, map with `slimCard` plus the SB-4 fields, collect into batches of ~1,000.
5. Upsert each batch with the service-role client, in this order (foreign keys): `cards` (deduplicated by card id,
   `onConflict: 'id'`), then `card_versions` (`onConflict: 'id'`), then `card_prices` from each card's `prices`
   (`onConflict: 'version_id,source'`, `source: 'scryfall'`, `updated_at` = now). Split the card with the app's
   `fromCard` mapper. Retry a batch up to 3 times with backoff.
6. Never delete rows: collection items, decks, loans and games reference `cards` / `card_versions`.
7. After the last batch: `rpc('snapshot_card_prices')` (today's prices of owned versions into `card_price_history`),
   then `rpc('compact_card_price_history')` (keeps daily rows for 90 days, Mondays after that). Both are service-role only.
8. Update the run row: `finished_at`, `rows_upserted`, `status: 'ok' | 'failed'`, `error`.
9. Log progress (rows/s, total) for the Actions log.

**Done when**
- [ ] Running it locally against `supabase start` fills `cards`, `card_versions` and `card_prices` with the full card pool
  and a second run exits early.
- [ ] Peak memory stays low (streaming); runtime is documented in the README.

### CC-3 · Schedule it every 24 h — P0
*Depends on:* CC-2
1. `.github/workflows/sync-cards.yml`: `schedule: cron: '0 4 * * *'` (daily) + `workflow_dispatch` for manual runs.
2. Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in the repo's Actions secrets (never in the app or `.env.example`).
3. Fail the workflow (so GitHub emails you) if the run row ends as `failed`.
4. *(If D-1 picked the Edge Function instead:* `supabase/functions/sync-cards` + a `pg_cron` job calling it through
   `pg_net` with the service key from Vault. It must process the stream in chunks across several invocations to stay
   under the function limits.)*
5. After the first successful run, apply the SB-4 RLS lockdown and stop client-side `cards` upserts.

**Done when**
- [ ] The job has run on schedule two days in a row; About shows the last sync time (CC-6 step 5).

### CC-4 · Read cards from Supabase first — P0
*Skill:* `scryfall` · *Depends on:* CC-3
In `createCardRepo()` (`src/data/supabase/supabaseRepos.ts`):
1. `autocomplete(q)` → `rpc('search_card_names')`. Fall back to Scryfall `/cards/autocomplete` only if the RPC errors.
2. `findByName(name, { fuzzy })` → `rpc('find_card')`. Fall back to `/cards/named`.
3. `getPrintings(cardId)` → `rpc('card_versions_of')`. Fall back to the `oracleid:` search.
4. New `findBySetNumber(set, number)` for the scanner (SC-4), from the table, with fallback to Scryfall `/cards/:set/:number`
   (add that endpoint to the client).
5. `getByIds` / `getByCardIds` already read the tables first. Keep the Scryfall fallback for cards newer than the last sync.
6. Mock repo: unchanged behaviour (Scryfall + bundled catalog).

**Done when**
- [ ] In Supabase mode, searching, adding and opening cards makes **zero** Scryfall API calls for cards that are in the
  table (verify with a request counter in a test using a fake Scryfall client).

### CC-5 · Device cache: freshness and size — P1
*Depends on:* CC-4
1. Store a `fetchedAt` timestamp per card in `useCardStore` (bump the persist `version` and add a `migrate`).
2. On app start (after bootstrap), refresh cards older than 24 h in the background with one `getByIds` batch,
   comparing `updated_at`.
3. Cap the persisted cache: keep cards referenced by your collection, decks, loans and friends' collections, and evict
   the rest (LRU) above ~5,000 cards. Check Android's AsyncStorage size limit. If the cache gets close to it, move the
   card cache to `expo-sqlite` (works in Expo Go).
4. Prune expired `scryfall:v1:*` response-cache entries on startup (the client never removes stale keys, it only skips them).
5. About screen: "Card data updated <relative time>" from `card_sync_runs`, plus a "Clear card cache" button (`clearCache()` + `useCardStore.reset()`).

**Done when**
- [ ] Persisted cache size stays bounded in a test with 10,000 synthetic cards; stale cards refresh on launch.

### CC-6 · Images — P2
1. `CardImage` already uses `cachePolicy="memory-disk"` + `recyclingKey`. Verify it holds up with a 5,000-card binder.
2. Prefetch (`Image.prefetch`) the `normal` image for the matched card in the scan sheet and the first screen of binder tiles.

**Done when**
- [ ] Scrolling the binder a second time doesn't hit the network (check with the network inspector).

### CC-7 · Official mana symbols — P2
*Skill:* `ui-component`
1. Resolve the `TODO` in `src/components/ui/ManaCost.tsx`: render Scryfall's symbol SVGs (`/symbology`, cached like
   other responses) instead of letter pips, including hybrid, Phyrexian and `{X}`.

**Done when**
- [ ] Mana costs on card detail and the scan sheet match the printed card.

---

## 3. Home with real data (HM)

All four Home blocks already derive from stores, so in Supabase mode they show real data once M1 is done. What's left
is the two fake Oracle tiles and the loading/empty/error states.

### HM-1 · Loading, empty and error states — P0
*Skill:* `ui-component` · *Depends on:* SB-6
1. While `bootstrapApp()` runs (Supabase mode, first launch), show skeleton tiles instead of "0 cards in your binder".
   Add a `bootstrapStatus` to the session store or a small `useAppStatus` hook.
2. New user: binder tile "Add your first cards" → Scan; decks section "Build your first deck" → Decks `+`;
   game night strip "Join or create a playgroup" → SB-7 onboarding.
3. Any load error → an inline "Couldn't load — Retry" card (calls `bootstrapApp()` again).

**Done when**
- [ ] A brand-new account sees helpful calls to action, not zeros. Component tests cover empty and error states.

### HM-2 · Pull-to-refresh on Home — P1
*Depends on:* SB-10
1. `RefreshControl` on the Home `Screen` scroll view that runs `bootstrapApp()` (collection, decks, playgroup).

**Done when**
- [ ] Pulling down updates a friend's newly added card in the friend-fit count.

### HM-3 · Real "1 card from a combo" tile — P1
*Depends on:* OR-1 or a Commander Spellbook integration
1. Add a `combos` service (`src/services/combos.ts`) for the Commander Spellbook API (`backend.commanderspellbook.com`):
   given a deck's card names, return combos it **includes** and combos it's **one card away** from. Check their docs and
   terms first; call it from a repo/store, cache results 24 h, never from a screen.
2. Selector: across your decks, count cards that would complete a combo, and say which deck ("in Edgar"). Prefer cards
   you or a friend own.
3. Replace `ORACLE_TEASERS.combo` on Home with this value. Hide the tile when the count is 0.
4. Tapping it asks the Oracle about that deck's combos (keep the current navigation).

**Done when**
- [ ] The tile shows real numbers for real decks, with a selector test using fixture combo data.

### HM-4 · Real "A commander hides in your binder" tile — P1
1. Selector `hiddenCommanders(binderEntries, decks, cardOf)`: legendary creatures (use `canBeCommander`) in your
   binder that lead none of your decks. Rank by how many of your spare cards share their color identity.
2. Show the top one by name ("The Wise Mothman hides in your binder"). Fall back to the generic tip if there's none.
3. Tap → Oracle with the commander question (the real Oracle gets the candidate in its context).

**Done when**
- [ ] With the mock seed the tile names The Wise Mothman. With an empty binder it doesn't crash. Selector is tested.

### HM-5 · Small Home polish — P2
1. Order "Your decks" by most recently edited (needs `decks.updated_at`, set by trigger on `deck_cards` changes).
2. Quick RSVP from the game-night strip (long-press or a small sheet) instead of only navigating.
3. Optional: greet by name ("Good evening, Chris") with "Planeswalker" as fallback. Check against VISION first.

---

## 4. Decks with real data and statistics (DK)

### DK-1 · Deck management — P0
*Skills:* `feature-slice`, `ui-component` · *Depends on:* SB-8
1. Deck detail "…" menu: **Rename**, **Edit theme**, **Bracket** (1–5 picker), **Partner / background** commander,
   **Delete deck** (with confirmation).
2. Deck card rows: long-press or swipe → **Remove**, **Move to category** (existing + new category), quantity for basics.
3. Commander change: pick a new commander. Cards outside the new color identity show up in the legality issues list.

**Done when**
- [ ] Every action persists in both modes and survives an app restart. Store tests cover each.

### DK-2 · Decklist import and export — P1
*Skill:* `scryfall` · *Depends on:* CC-4
1. "Import decklist" on the new-deck flow: paste text in the common formats (`1 Sol Ring`, `1x Sol Ring (C21) 263`,
   Moxfield/Archidekt exports with `// Category` or `[Category]` headers, `*CMDR*` markers).
2. Parser in `src/utils/decklist.ts` (pure, tested). Resolve names via the `cards` table (CC-4), then `/cards/collection`
   in batches of 75 for leftovers.
3. Preview screen: resolved cards, unresolved lines (fix by searching), detected commander → Create.
4. Export: "Share decklist" as plain text grouped by category (Share sheet).

**Done when**
- [ ] A Moxfield export of a 100-card deck imports with 0 unresolved lines. Parser has tests for each format.

### DK-3 · Better automatic categories — P1
1. `defaultCategoryFor` only knows Lands / Creatures / Planeswalkers / Other. Add oracle-text heuristics for Ramp
   (`produced_mana`, "search your library for a … land"), Card draw ("draw"), Removal ("destroy target", "exile
   target"), Board wipes ("destroy all"), Counterspells, Tutors.
2. Keep it a pure function with a table-driven test of ~30 real cards.

**Done when**
- [ ] Adding Cultivate lands in Ramp, Swords to Plowshares in Removal, Rhystic Study in Card draw.

### DK-4 · Deck statistics — P0/P1
*Skill:* `ui-component` (charts: follow the `dataviz` skill) · *Depends on:* SB-4 for game changers and prices
The Stats tab has the mana curve, Owned / In group / Missing and card types. Add pure functions in
`src/utils/deckStats.ts` (each with tests) and sections in `DeckStats.tsx`:
1. **P0 Summary row:** total cards, land count, nonland count, ramp count (average mana value is already under the curve).
2. **P0 Category targets:** counts vs common Commander guidelines (Lands 35–38, Ramp ≥ 10, Card draw ≥ 10,
   Removal ≥ 8, Board wipes 2–4), shown as rows with a gold check or an orange "low" note. Targets are constants in one file.
3. **P0 Legality issues list:** `checkCommanderDeck` already returns `issues`. Show them as a list (now they only exist
   in the chip's accessibility label).
4. **P1 Color balance:** colored pips in mana costs per color vs lands/sources producing each color
   (`produced_mana`), as paired bars. Flag a color with < 30 % of the sources its pips need.
5. **P1 Bracket check:** number of Game Changers (`game_changer`), extra-turn cards, mass land denial, and known 2-card
   combos (HM-3 service), giving a suggested bracket. Show it next to the bracket you set ("Set: 3 · Looks like: 3").
6. **P1 Cost to complete:** sum of the cheapest printing's price for cards nobody in the group owns ("≈ €34 to finish"),
   plus a "Borrow from friends" list grouped by friend with a one-tap request for all (uses `requestLoan`).
7. **P2 Curve by type:** stacked curve (creatures vs spells), and a "by category" curve.
8. **P2 Stats on the deck list:** average MV and bracket chips on `DeckListItem`.

**Done when**
- [ ] Atraxa from the seed shows: 8 ramp (low), the issues list, color balance and a bracket suggestion. Every stat
  has a unit test; the screen passes `vision-review`.

### DK-5 · Decks list improvements — P2
1. Sort (recent, name, % owned) and a search field once there are more than ~8 decks.
2. "Friends' decks" section: RLS already lets you read playgroup peers' decks. Add `DeckRepo.listForUsers(ids)` and a
   read-only deck detail with ownership from the viewer's perspective.

---

## 5. Binder with working filters (BN)

The filters exist (`filterBinder` in `src/stores/selectors/binder.ts`) but have real gaps: entries whose card data
isn't loaded yet fail every color, type and search filter and silently disappear; type chips are single-select, so
"spare creatures" is impossible; there's no sort.

### BN-1 · Make the existing filters correct — P0
*Skill:* `write-tests` first, then fix · *Depends on:* —
1. Write failing tests in `src/stores/selectors/__tests__/binder.test.ts` for: cards not yet loaded, double-faced cards
   (type from either face), colorless artifacts vs lands under `C`, multicolor cards, search with accents/case.
2. Cards not yet loaded: keep them in the list (placeholder tile) and show "Loading N cards…" instead of dropping them.
   Make sure `ensureIds` for the whole collection runs (and retries) on Binder focus.
3. Search: match the name of any face, plus type line (P1: oracle text behind a toggle).
4. Type filter: check **all** faces' type lines (MDFC lands such as "Sea Gate Restoration" count as lands).
5. Color filter semantics: decide and document. Recommended default "contains any selected color", plus a mode
   switch: *Any of* / *Exactly* / *Within (commander identity)*. The "Within" mode helps when building a deck.
   Add an `M` (multicolor) option if it fits the design.
6. "Showing N of M": count cards (quantities) or entries consistently, and say which.

**Done when**
- [ ] New tests pass. No card disappears from the binder because its data is still loading.

### BN-2 · Combinable filters — P0
1. Split the chips into **status** toggles (Spare, Foils, Lent out, In a deck) and **type** chips (All, Creatures,
   Instants, Sorceries, Artifacts, Enchantments, Planeswalkers, Lands, Legendary). Status and type combine, and you
   can pick more than one type (OR).
2. Update `BinderFilters` to `{ query, colors, colorMode, types: Set, status: Set }` and `filterBinder` accordingly.
3. "Clear filters" link when anything is active, and a count of active filters.

**Done when**
- [ ] "Spare + Creatures + G" shows exactly the spare green creatures (test with the seed).

### BN-3 · Sorting — P1
1. Sort menu: Name (default), Recently added (`createdAt`), Mana value, Color (WUBRG order), Rarity, Quantity,
   Price (after D-4).
2. Pure `sortBinder(entries, sort, cardOf)` with tests.

### BN-4 · Advanced filter sheet — P1
*Depends on:* SB-4
1. Bottom sheet ("Filters" button next to search): Mana value range, Rarity, Set (searchable), Condition, Foil only,
   In deck X / In no deck, Commander-legal only, Can be commander.
2. Filter state lives in a small `useBinderFilterStore` (not persisted, or persisted per session) so it survives tab switches.
3. Deep links: Home tiles and other screens can open the binder pre-filtered (`/binder?status=spare`).

**Done when**
- [ ] Every filter has a selector test. Switching tabs keeps the filters.

### BN-5 · Performance with big collections — P1
1. Test with 5,000+ entries: memoize `cardOf`, debounce search (~150 ms), give `FlatList` `getItemLayout` (fixed tile
   height), keep `CardTile` memoized.
2. Precompute a per-entry search key (lowercased names of all faces) once per card-store change, not per keystroke.

**Done when**
- [ ] Typing in search on a 5,000-card binder stays smooth on a mid-range Android phone.

### BN-6 · Edit what you own — P1
*Depends on:* SB-8
1. Card detail → "In your binder": list each stack (printing · foil · condition · qty) instead of one total.
2. Per stack: change foil, condition, printing (PrintingsSheet), quantity, delete.
3. Binder tile: show the printing you have most of, and "3 printings" when there are several.

### BN-7 · Collection import — P1
*Skill:* `scryfall` · *Depends on:* CC-4, SB-8
1. The binder's import button (now a single-card search) opens a choice: **Search a card** / **Import a list**.
2. Formats: plain text (`3 Sol Ring`, `1 Sol Ring (C21) 263 *F*`), CSV from ManaBox, Moxfield, Deckbox, Archidekt
   (detect by header row). Parser in `src/utils/collectionImport.ts`, tested per format.
3. Resolve by set + collector number when present (exact printing), else by name; batch through the `cards` table, then
   `/cards/collection` (75 per request) for leftovers.
4. Preview: resolved count, unresolved lines, duplicates merged; choose "Add to" or "Replace" binder; then `bulkUpsert`.
5. Update the hint text in `binder.tsx` ("CSV and text-list import are coming later").

**Done when**
- [ ] A 1,000-line ManaBox CSV imports in under a minute without a Scryfall 429.

### BN-8 · Spare definition — P1
*Depends on:* D-5
1. Implement the chosen definition in `buildBinderEntries` / `binderTotals`, update `seedIntegrity.test.ts` and VISION §4/§8 if the number changes.

---

## 6. Working card scanner (SC)

The pipeline is already split correctly: `recognizeCardName(imageUri)` (mock) → lookup → sheet. Keep the adapter
signature, put real recognition behind it, and make the result richer (printing, real confidence).

### SC-1 · Recognition contract — P0
*Depends on:* D-3
1. Extend `Recognition` in `src/services/scan.ts` to `{ name, setCode?, collectorNumber?, lang?, confidence }`.
   The mock fills only `name`. Callers still compile.
2. Add `EXPO_PUBLIC_SCAN_MODE=mock|edge` to `src/config.ts` and `.env.example`, like the Oracle mode.

### SC-2 · Photo pipeline — P0
1. After `takePictureAsync`, crop to the viewfinder rectangle (screen → photo coordinates) and resize to ~1024 px on the
   long side as JPEG ~0.7 with `expo-image-manipulator` (`npx expo install`, works in Expo Go).
2. Keep EXIF orientation right on both platforms. Test portrait and landscape holds.
3. Never store the photo: delete the temp file after recognition.

**Done when**
- [ ] The uploaded image is the card only, upright, < 300 KB.

### SC-3 · Edge Function `scan` (cloud recognition) — P0
*Skill:* `oracle-edge` (same patterns: JWT check, secrets, structured output) · *Depends on:* SB-6, SC-2
1. `supabase/functions/scan/index.ts`: POST image (base64 or multipart) with the user's JWT. Reject without a valid
   session, images > 2 MB, non-images.
2. Call Claude (vision) with structured output:
   `{ name, set_code, collector_number, language, is_card: boolean, confidence: 0–1 }`. Prompt: read the title line,
   the set code and collector number from the bottom-left. Return `is_card: false` for non-cards.
3. Per-user rate limit (e.g. 300 scans/day) via a `scan_usage` table or a counter, so a stuck shutter can't burn the budget.
4. Log nothing that identifies the image. Don't store it.
5. `edgeRecognizer` in `src/services/scan.ts` calls `supabase.functions.invoke('scan')`. `recognizeCardName` picks
   mock or edge from `config.scanMode`.

**Done when**
- [ ] Photos of 20 real cards (old frame, new frame, foil, borderless, showcase, DFC, one non-English) → ≥ 90 % correct
  names and ≥ 75 % correct printings. Keep that benchmark set (as names + expected ids) in `docs/` for regressions.

### SC-4 · Matching: printing first, then name — P0
*Depends on:* CC-4, SC-3
1. If `setCode` + `collectorNumber` come back: `CardRepo.findBySetNumber` → exact printing.
2. Else / if not found: `findByName(name, { fuzzy: true })` (DB `find_card`, then Scryfall fuzzy).
3. Confidence = recognition confidence × match quality (exact printing 1.0, exact name 0.95, fuzzy lower). The sheet
   already shows "98 % match". Make it real.
4. Low confidence (< 0.7): show the top 3 candidates (autocomplete on the recognized name) to pick from, plus "Type it".
5. `identifyCard` in `src/services/scan.ts` already takes a `lookup`. Extend it to take the richer recognition.

**Done when**
- [ ] Unit tests with a fake recognizer cover: exact printing, name-only, fuzzy typo ("Sol Rnig"), no match, low confidence.

### SC-5 · Scan sheet and session UX — P1
1. Foil toggle: disable when the printing has no foil finish (`finishes` from SB-4); preselect foil for foil-only printings.
2. "Card found" sheet: show set name + collector number so the user can see which printing was matched.
3. Toast "Added 1× Sol Ring" gets **Undo** (removes that session entry from collection/deck).
4. Duplicate guard: the same card scanned twice within ~3 s asks "Add another?" instead of adding silently.
5. "Done" shows a summary ("Added 14 cards · 2 to Atraxa") before going to Binder.
6. Offline: a clear "Scanning needs a connection — use Type it" state instead of a generic error.

**Done when**
- [ ] `useScanStore.test.ts` covers undo, duplicate guard and offline. A 30-card session works end to end on a phone.

### SC-6 · On-device recognition (dev build) — P2
*Depends on:* D-3, X-4
1. Move to an EAS development build (deliberate decision, update CLAUDE.md "Expo Go" rule).
2. Add on-device text recognition (ML Kit on Android / Vision on iOS through a maintained RN library) as a third
   recognizer: OCR the title line, use the cloud recognizer only when on-device confidence is low.
3. Optional: auto-capture when a card-shaped rectangle is steady in the viewfinder (frame processor).

---

## 7. Playgroup (PG)

### PG-1 · Plan game nights — P0
*Skills:* `feature-slice`, `ui-component` · *Depends on:* SB-8
1. "Plan game night" sheet: date/time, location (default: last used), notes. Edit and cancel for the creator.
2. Show the next upcoming night. If there's none, the "No game night planned yet" card gets a "Plan one" button.
3. Optional (P2): recurring weekly night ("every Thursday 19:00") generating the next one automatically.

### PG-2 · Lending lifecycle — P0
*Depends on:* SB-8
1. Owner: "Mark returned" on lent cards. Requester: "Cancel request" on pending ones.
2. Optional note on requests ("for Thursday?"). The `note` column exists.
3. Lent-out cards count as unavailable: show "Lent to Mira" on the binder tile and card detail, and treat borrowed cards
   as "in group" (not owned) in deck ownership.
4. History list (returned/declined), collapsed by default.

### PG-3 · Log games properly — P1
1. `LogGameSheet`: players (members multi-select), winner, winner's commander (search), duration, date (default now).
2. Seasons: `seasons` table or a playgroup setting with a start date. "Wins this season" filters by it, plus a "New season" action.
3. Recent games list with commanders.

### PG-4 · Member profiles — P2
1. Tap a member → their profile: their decks (read-only, DK-5), cards they can lend, wins.
2. Leave group / remove member (owner) using the `members: leave` policy. Owner removal needs a new RPC.

### PG-5 · Notifications — P2
1. Push notifications (`expo-notifications`): borrow request received, request answered, new game night, RSVP reminder
   the day before. Send them from Database Webhooks → an Edge Function → Expo Push API. Store push tokens in a
   `push_tokens` table (RLS: own rows).

---

## 8. Oracle (OR)

Follow the `oracle-edge` skill, and the `TODO(context)` / `TODO(claude)` notes in `supabase/functions/oracle/index.ts`.

### OR-1 · Context builder — P1
*Depends on:* SB-2, CC-4
1. In the Edge Function, as the calling user (RLS applies): decks + deck_cards joined to cards (name, type, mana cost,
   category), owned oracle ids with quantities and spares, peers' owned oracle ids by member name, the user's open loans.
2. Compact, stable-ordered text (sorted, so the prompt prefix caches well). Cap the size; summarize big binders.

### OR-2 · Claude call with structured output — P1
1. Replace the placeholder with a structured-output call returning `OracleAnswer` (`src/types/oracle.ts`), including the
   optional `featured` commander and card chips with `tone`. Use the model and settings the `oracle-edge` skill specifies.
2. Handle refusals, timeouts and errors with a friendly answer instead of a crash.
3. Per-user daily limit (like SC-3) to cap cost.

### OR-3 · Actions from real answers — P1
1. Canned answers wire their buttons ("Apply these swaps", "Start a Mothman deck", "Ask Mira") directly. Add an
   `actions` array to the answer schema (`apply_swaps {deckId, remove[], add[]}`, `create_deck {commander}`,
   `request_loan {card, ownerId}`) and have the client validate and run them through existing store actions.
2. Always confirm before changing a deck.

### OR-4 · Chat polish — P2
1. Send the previous turns (trimmed) so follow-up questions work.
2. Persist the last conversation per user. Remove the "Test data · preview" labels and the preview fallback text when
   `oracleMode === 'edge'`.
3. Suggestions generated from your data ("Improve Muldrotha?") instead of the three fixed ones.

**Done when (whole section)**
- [ ] `EXPO_PUBLIC_ORACLE_MODE=edge` answers free-typed questions about your real decks, the chips name real
  friend-owned cards, and actions apply after confirmation.

---

## 9. Cross-cutting (X)

### X-1 · Per-user persisted data — P0
*Depends on:* SB-6
`useCardStore`, `useCollectionStore` and `useDeckStore` persist to fixed AsyncStorage keys (`src/stores/storage.ts`).
In Supabase mode, user B signing in on the same phone would briefly see user A's binder, and mock-mode data can leak into
Supabase mode.
1. Include the data mode and user id in the persist key (or clear on sign-out and on user change).
2. `signOut()` → reset collection, decks, playgroup, scan and oracle stores (the card cache can stay, it isn't personal).
3. On mode change (mock ↔ supabase), discard persisted personal data.

**Done when**
- [ ] Test: sign in as A, sign out, sign in as B → nothing of A's is visible at any point.

### X-2 · Error reporting and offline awareness — P1
1. Offline banner (`@react-native-community/netinfo`). Disable network-only actions (scan, Oracle) with an explanation.
2. Optional crash reporting (e.g. Sentry's Expo SDK) with no personal data, off in mock mode.

### X-3 · CI — P1
1. `.github/workflows/ci.yml` on push/PR: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`.
2. Later: `npx supabase db reset` + `npx supabase test db` in CI using the Supabase CLI's local stack.

### X-4 · Builds and distribution to friends — P1
1. `eas.json` with `development`, `preview` (internal distribution) and `production` profiles.
2. Spellbinder icon and splash art (README lists them as template images). Sigil on obsidian.
3. Internal distribution: Android APK link and/or iOS TestFlight for the five of you. OTA updates with `expo-updates`.
4. Separate Supabase projects (or at least separate env files) for dev and prod.

### X-5 · Accessibility and design pass — P1
1. Run the `vision-review` skill on every screen touched by this list, and fix the mismatches.
2. Screen-reader pass on iOS (VoiceOver) and Android (TalkBack): new sheets, filters, sign-in, stats charts (give
   charts an accessible text summary).
3. Dynamic type: check the binder grid and deck stats at the largest font size.

### X-6 · Docs — P1
1. Keep README's "What's stubbed" table in sync as items here land, and remove rows when done.
2. Update VISION §6 when the data model changes (SB-4, PG-3, PG-5).
3. Update `CLAUDE.md` if the Expo Go rule changes (SC-6) or new skills/commands are added.

### X-7 · Legal and etiquette check before sharing — P1
1. Fan Content Policy text and Scryfall attribution stay in About (they're there now). Add Commander Spellbook
   attribution if HM-3 lands.
2. Prices (D-4): label them as approximate, from Scryfall, and never link to a store with an affiliate code.
3. Confirm the sync job sends the `User-Agent` Scryfall asks for and downloads bulk data at most once a day.
