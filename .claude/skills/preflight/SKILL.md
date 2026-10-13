---
name: preflight
description: Spellbinder's definition of done — run typecheck, lint and tests, then audit the change against the CLAUDE.md hard rules that tooling can't catch (secrets, network access outside services, Scryfall etiquette, card identity, accessibility, Expo Go compatibility). Use before saying any coding task is finished, before committing, or when asked to "check", "verify" or "make sure everything passes".
argument-hint: "[--fix]"
---

# Preflight

Run all of this before you report a task as done. Report results honestly: if something fails, say what failed and
show the output. Never skip a step or weaken a check (no `eslint-disable`, `@ts-ignore`, `.skip`, or deleted
assertions) to get to green. With `$ARGUMENTS` = `--fix`, fix what you find and rerun; otherwise report only.

## 1. Tooling (run all three, even if one fails)
```
npx tsc --noEmit
npx expo lint
npm test
```
ESLint already enforces: no `fetch` outside `src/services/` and `scripts/`, and no hex/`rgb()` color literals in
`app/` or `src/components/`.

## 2. Scope the audit
Look at what changed: `git status` and `git diff` (plus `git diff --cached`). Audit those files, not the whole repo.

## 3. Hard-rule audit
| # | Rule (CLAUDE.md) | How to check |
|---|---|---|
| 1 | **No secrets in the app.** Only `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_DATA_MODE`, `EXPO_PUBLIC_ORACLE_MODE` in client code, plus the dev-only `EXPO_PUBLIC_TEST_USER_EMAIL` / `_PASSWORD`, which must stay behind `__DEV__` in `src/config.ts` so release bundles drop them | Grep the diff for `sk-ant`, `ANTHROPIC`, `service_role`, `SUPABASE_SERVICE`, `Bearer `, long base64/JWT-looking literals; `process.env.EXPO_PUBLIC_` read outside `src/config.ts` (`NODE_ENV` checks are fine); any new `.env*` file other than `.env.example` |
| 2 | Screens never call services or `fetch` | Imports from `@/services/` in `app/**` or `src/components/**` (types and pure helpers like `getImageUri` are fine) |
| 3 | Stores → repositories → services | Stores import `getRepos()`, not Supabase or Scryfall clients directly (pure helpers from `@/utils` are fine) |
| 4 | Scryfall only through the shared client | `api.scryfall.com` anywhere except `src/services/scryfallClient.ts`; a new `createScryfallClient(` in app code |
| 5 | Card identity | Collection rows keyed by `versionId` + `cardId`; deck cards, loans, games and ownership by `cardId` (via `getCardId`) |
| 6 | Card images | No `resizeMode`/`contentFit="cover"` on full card images; every `art_crop` / `variant="art"` has artist credit nearby |
| 7 | Theme tokens | No raw colors in `src/stores`, `src/utils` either; no `fontWeight` on Cinzel/Manrope text; spacing from tokens |
| 8 | Accessibility | Every `IconButton`/icon-only `Pressable` has `accessibilityLabel`; touch targets ≥ 44 pt; toggles/tabs have `accessibilityRole`/`accessibilityState` |
| 9 | Architecture | Repo interface changes implemented in **both** `mockRepos.ts` and `supabaseRepos.ts`; no derived state stored in a Zustand store; routes in `app/` stay thin |
| 10 | Expo Go | New deps added with `npx expo install` (versions match the SDK in `package.json`); no package that needs custom native code or a config plugin Expo Go lacks |
| 11 | Mock mode | App still works with `EXPO_PUBLIC_DATA_MODE` unset (the default) and no network beyond Scryfall |
| 12 | Schema | No SQL in this repo: schema changes are migrations in `../spellbinder-db` |
| 13 | No emoji | No emoji in UI strings or Oracle copy |
| 14 | Fan Content Policy | The About screen still shows the WotC Fan Content Policy disclaimer and Scryfall attribution |

## 4. Optional: see it run
For UI changes, offer to start the app (`npx expo start`, or the `run` skill) — tests don't prove layout.

## 5. Report
```
Preflight: PASS | FAIL
- typecheck: pass/fail (N errors)
- lint: pass/fail (N problems)
- tests: N passed, M failed
- audit: ✓ all rules  |  ✗ #4 src/foo.ts:12 — direct Scryfall fetch
```
Only say the task is done when everything passes, or when the user has accepted the listed exceptions.
