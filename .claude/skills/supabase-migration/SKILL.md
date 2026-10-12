---
name: supabase-migration
description: Change the Spellbinder Supabase schema safely — write a numbered SQL migration with RLS policies and indexes, then update row types, mappers, the Supabase repo, the mock repo and domain types to match. Use for any new table, column, policy, function or index, and to create the initial schema (supabase/migrations/0001_init.sql) if it doesn't exist yet.
argument-hint: <schema change>
---

# Supabase migration

Make the schema change `$ARGUMENTS`. The schema is a **contract shared by the mobile app and the future website**,
so it is changed only by migrations and only in backward-compatible steps.

Source of truth for tables: `docs/VISION.md` §6. Client side: `src/data/supabase/mappers.ts` (row types) and
`src/data/supabase/supabaseRepos.ts` (queries). SQL templates: [reference.md](reference.md).

## 0. Check the current state
- `ls supabase/migrations`. **If the folder or `0001_init.sql` is missing**, create the initial schema first, from
  VISION §6 and the `*Row` interfaces in `mappers.ts` (they are the column list the app already expects, including
  `cards.layout`, `power`, `toughness`, `loyalty`, `rarity`). Use the templates in reference.md. Also create
  `supabase/config.toml` with `npx supabase init` only if the user agrees to add the Supabase CLI.
- Read every existing migration so the new one builds on them. Never edit a migration that has already been applied —
  add a new one.

## 1. Write the migration
- File: `supabase/migrations/<NNNN>_<snake_description>.sql` (next number, 4 digits), or the CLI's timestamp name if
  the project uses `supabase migration new`. Keep one naming scheme.
- Idempotent where cheap (`create table if not exists`, `create index if not exists`, `drop policy if exists` before `create policy`).
- **Every new table:** `alter table … enable row level security;` plus explicit policies. A table with RLS on and no
  policies is invisible — that's the safe default, but say so if it's on purpose.
- Primary keys `uuid default gen_random_uuid()` (except `cards.scryfall_id` and join tables), `created_at timestamptz
  default now()`, foreign keys with `on delete cascade` for owned rows, `check` constraints for status enums
  (match the TS unions in `src/types/domain.ts`).
- Index every foreign key and every column the repos filter on (`user_id`, `owner_id`, `playgroup_id`, `oracle_id`).
- Card identity: collection rows reference `cards(scryfall_id)` and also store `oracle_id`; deck/loan rows store
  `oracle_id` only.

## 2. RLS policy model (keep it consistent)
| Data | Read | Write |
|---|---|---|
| Your own collection / decks / deck_cards | you + members of any playgroup you share | only you (`auth.uid() = user_id/owner_id`) |
| `profiles` | you + playgroup peers | only you |
| `playgroups`, `playgroup_members`, `game_nights`, `rsvps`, `games` | members of that playgroup | members (RSVP: only your own row) |
| `loan_requests` | requester and owner | requester creates; owner sets lent/declined; either marks returned |
| `cards` (Scryfall cache) | any authenticated user | any authenticated user can insert/upsert |

Use the `security definer` helpers in reference.md (`is_playgroup_member`, `shares_playgroup_with`) instead of
nested subqueries — they avoid recursive-policy errors on `playgroup_members`.

## 3. Backward compatibility (two clients!)
- Additive first: new nullable columns or columns with defaults, new tables, new policies.
- Renames and drops happen in two steps: add the new thing and ship clients that use it; drop the old thing in a later
  migration. Note any breaking step in the migration's header comment.
- Never loosen RLS to make a query work — fix the query or add a narrow policy.

## 4. Update the client in the same change
1. `src/types/domain.ts` — domain fields (camelCase).
2. `src/data/supabase/mappers.ts` — `*Row` interface + `toX`/`fromX`. (TODO stays: replace with
   `npx supabase gen types typescript` output once a project is linked; if it's linked, regenerate instead.)
3. `src/data/supabase/supabaseRepos.ts` — queries, all wrapped in `check()`.
4. `src/data/repositories.ts` + `src/data/mock/mockRepos.ts` — the mock must keep working with the same behavior.
5. Mock seed if the new data should show up in mock mode (`seed-data` skill).

## 5. Safety
- **Never** run `supabase db push`, `db reset --linked`, or SQL against a remote project without asking first.
  Local only (`npx supabase start` / `db reset`) if the user has the CLI and Docker.
- No secrets in migrations. Service-role keys stay in Supabase secrets.
- `supabase/` is ignored by ESLint and Jest on purpose (Deno + SQL); don't import from it in app code.

## Monorepo note
When the repo becomes `apps/mobile` + `apps/web`, `supabase/` stays at the root and generated types move into a shared
package. Write migrations as if a second client already exists.

## Done when
- [ ] New migration file; RLS enabled with policies for every new table; indexes on FKs and filter columns.
- [ ] Row types, mappers, Supabase repo, mock repo and domain types all updated and consistent.
- [ ] Change is backward compatible (or the two-step plan is written in the header comment).
- [ ] The `preflight` skill passes (typecheck catches mapper/interface drift).
