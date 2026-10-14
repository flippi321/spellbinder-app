---
name: write-tests
description: Write Jest tests for Spellbinder in the root `tests/` folder, where `tests/unit/` and `tests/integration/` each mirror `src/`. Covers every scenario, every thrown error (valid and invalid input), every enum value, and a coverage bar of 95/90 for logic layers and 85/80 overall. Uses fake repositories for store flows, a fake Supabase client for repos, Testing Library for components and a fake clock for Scryfall. Use when adding tests for new or existing code, when fixing a bug (write the failing test first), or when debugging risky code to map out how it behaves.
argument-hint: <what to test>
---

# Writing tests

Stack: `jest-expo` preset, `@testing-library/react-native` v14, config in the `jest` block of `package.json`.
`supabase/` is Deno code and is never run by Jest (RLS tests are SQL; see "Supabase" below).

## Where tests live

Tests never sit next to the code. They live in a root `tests/` folder, split by kind, and each half mirrors the
app's folder structure exactly:

```
tests/
  setup.ts                      AsyncStorage mock and other global setup
  helpers/                      shared fixtures and fakes (not tests themselves)
    cards.ts                    makeCard(), makeDeck(), makeItem()
    repos.ts                    fakeRepos() — jest.fn() per repo method
    supabase.ts                 fakeSupabase() — chainable PostgREST fake
    clock.ts                    fakeClock() — now/sleep for rate limits and TTLs
  unit/                         mirrors src/ (and app/ if ever needed)
    utils/cards.test.ts                       ← src/utils/cards.ts
    stores/selectors/ownership.test.ts        ← src/stores/selectors/ownership.ts
    stores/selectors/binder.test.ts
    data/supabase/mappers.test.ts             ← src/data/supabase/mappers.ts
    services/scryfallClient.test.ts           ← src/services/scryfallClient.ts
    components/ui/Stepper.test.tsx            ← src/components/ui/Stepper.tsx
  integration/                  mirrors src/ and app/
    stores/useScanStore.test.ts               ← src/stores/useScanStore.ts
    data/supabase/supabaseRepos.test.ts       ← src/data/supabase/supabaseRepos.ts
    data/mock/seedIntegrity.test.ts           ← src/data/mock/seed + mockRepos
    app/(tabs)/binder.test.tsx                ← app/(tabs)/binder.tsx
```

- **Path rule:** `src/<path>/<name>.ts(x)` → `tests/{unit|integration}/<path>/<name>.test.ts(x)`.
  Routes: `app/<path>.tsx` → `tests/integration/app/<path>.test.tsx`. One module may have both a unit and an
  integration test file.
- **Imports:** always use the `@/` alias (`import { useScanStore } from '@/stores/useScanStore'`). Never use
  relative paths into `src/`. Helpers are imported relatively (`../../helpers/cards`).
- **Moving or renaming a source file moves its test files too**, in the same change.
- Never put test files in `app/`: Expo Router would treat them as routes.

### Unit or integration?

| Kind | Definition | Typical subjects |
|---|---|---|
| **Unit** | One module in isolation. Every other app module it touches is injected or `jest.mock`ed. | `src/utils`, `src/stores/selectors`, `mappers.ts`, `scryfallClient.ts` (injected `fetch`/clock), presentational components rendered with props only |
| **Integration** | Two or more real app modules working together. Only the outermost boundary (network, Supabase client, native modules) is faked. | Store flows with fake repos, stores + selectors, `supabaseRepos.ts` + real mappers on a fake Supabase client, `mockRepos` + seed, components or routes that read stores |

If a test needs `setRepos`, a store, or more than one real `src/` module, it's an integration test.

### Jest config this layout assumes

If `package.json` doesn't have this yet, add it (and move `jest.setup.ts` to `tests/setup.ts`):

```jsonc
"scripts": {
  "test": "jest",
  "test:unit": "jest --selectProjects unit",
  "test:int": "jest --selectProjects integration",
  "test:coverage": "jest --coverage"
},
"jest": {
  "projects": [
    {
      "displayName": "unit",
      "preset": "jest-expo",
      "setupFiles": ["<rootDir>/tests/setup.ts"],
      "testMatch": ["<rootDir>/tests/unit/**/*.test.[jt]s?(x)"],
      "moduleNameMapper": { "^@/assets/(.*)$": "<rootDir>/assets/$1", "^@/(.*)$": "<rootDir>/src/$1" }
    },
    {
      "displayName": "integration",
      "preset": "jest-expo",
      "setupFiles": ["<rootDir>/tests/setup.ts"],
      "testMatch": ["<rootDir>/tests/integration/**/*.test.[jt]s?(x)"],
      "moduleNameMapper": { "^@/assets/(.*)$": "<rootDir>/assets/$1", "^@/(.*)$": "<rootDir>/src/$1" }
    }
  ],
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/types/**",
    "!src/theme/**",
    "!src/data/mock/seed/**",
    "!src/services/oracleAnswers.ts",
    "!src/services/scanSamples.ts"
  ],
  "coverageThreshold": {
    "global":                { "statements": 85, "lines": 85, "functions": 85, "branches": 80 },
    "./src/utils/":          { "statements": 95, "lines": 95, "functions": 95, "branches": 90 },
    "./src/stores/":         { "statements": 95, "lines": 95, "functions": 95, "branches": 90 },
    "./src/services/":       { "statements": 95, "lines": 95, "functions": 95, "branches": 90 },
    "./src/data/supabase/":  { "statements": 95, "lines": 95, "functions": 95, "branches": 90 }
  }
}
```

## Coverage bar

| Scope | Statements / lines / functions | Branches |
|---|---|---|
| Logic layers: `src/utils`, `src/stores` (incl. selectors), `src/services`, `src/data/supabase` (each folder as a whole) | **95%** | **90%** |
| Everything else in `src/` combined (components, mock repos, config) | **85%** | **80%** |
| Any file you add or change | Must meet its folder's bar on its own. Never lower a threshold to make a change pass. | |

- Excluded from coverage: `app/` routes (thin; covered by integration tests where they have logic), types, theme
  tokens, seed data and canned Oracle/scan fixtures.
- Lines that genuinely can't run under Jest (e.g. the `Platform.OS !== 'web'` branch's AppState listener, if it can't
  be triggered) may get `/* istanbul ignore next -- <reason> */`. The reason is mandatory. Never use it to skip error
  handling.
- Run `npm run test:coverage` and read the per-file table for the files you touched, not just the pass/fail.

## Scenario checklist: every unit under test

Work through this list for each exported function, store action, repo method and interactive component. Each item
that applies gets at least one test. The ones that don't apply are skipped on purpose, not forgotten.

1. **Happy path** with typical input.
2. **Boundaries:** empty list/string, 0, 1, the min/max (e.g. `Stepper` at `min` and `max`), and exactly at and one
   past any size limit (`chunk` at 100/101 rows, Scryfall batches at 75/76 identifiers, autocomplete at 1/2 chars).
3. **Every thrown error and rejection** (see below): valid input → no throw; each invalid input → throws.
4. **Every enum value** (see below).
5. **Both sides of every boolean and optional:** `foil` true/false, `fuzzy` true/false, `partnerCardId` null and set,
   `data.session` present and absent, a card with and without `card_faces`.
6. **Async failure:** the dependency rejects → the error surfaces where the code promises (thrown, rejected, or the
   store's `error`), and state is not left half-updated (`loading` back to `false`, no phantom items).
7. **Repeat and duplicate calls:** same printing scanned twice merges into one stack, in-flight requests de-duplicate,
   upsert is idempotent.
8. **Signed-out / missing context:** actions that call `requireUserId()` with no session user.

## Exceptions: test correct AND incorrect input

Every `throw`, every `reject`, and every `catch` that turns an error into state needs tests on both sides.
`grep -n "throw \|reject\|catch" <file>` to list them before you start; each hit is a required test.

```ts
// sync: valid input does not throw, and returns the right value
expect(catalog.require('Sol Ring').name).toBe('Sol Ring');
// sync: invalid input throws, and the message is asserted (not just "throws something")
expect(() => catalog.require('Not A Card')).toThrow(/"Not A Card" is not in src\/data\/mock\/cards.json/);

// async: resolves on good input, rejects with the right error on bad input
await expect(oracle.ask('q', ctx)).resolves.toMatchObject({ intro: expect.any(String) });
mockInvoke.mockResolvedValueOnce({ data: { answer: null }, error: null });
await expect(oracle.ask('q', ctx)).rejects.toThrow('The Oracle returned an empty answer.');

// error class and fields, when the code branches on them
await expect(client.get('/cards/x')).rejects.toMatchObject({ name: 'ScryfallError', status: 500 });
```

- Assert the **message or type**, never a bare `.toThrow()`.
- Test **each distinct invalid input** separately. Use `it.each` when there are three or more (null, empty, unknown
  name, wrong case…).
- Stores that catch: the action must **not** throw; assert `error` is set to the message, `loading` is `false`, and
  data is unchanged. Then assert a later successful call clears `error`.
- Swallowed errors (`.catch(() => undefined)`): assert the flow still completes when that call rejects.
- Supabase `check()`: a result with `error` throws `Supabase: <message>`; a result with `data` returns it.
- Scryfall 404 handling: 404 maps to `null`/empty; any other status rethrows.

## Enums: test every value

Every union type the code branches on (`LoanStatus`, `RsvpStatus`, `CardCondition`, `Legality`, `ImageSize`,
`OracleSuggestionId`, `PlaygroupRole`, `DataMode`, Commander brackets, mana colors) is tested for **every** value,
plus at least one invalid value where the input comes from outside (DB rows, Scryfall, route params).

TypeScript unions have no runtime list, so build one that **fails `tsc` when a value is added or removed**:

```ts
import type { LoanStatus } from '@/types';

const LOAN_STATUSES = Object.keys({
  pending: true, lent: true, declined: true, returned: true,
} satisfies Record<LoanStatus, true>) as LoanStatus[];

it.each(LOAN_STATUSES)('maps loan status %s from a row and back', (status) => {
  expect(fromLoan(toLoan({ ...loanRow, status })).status).toBe(status);
});

it('rejects an unknown loan status from the database', () => {
  expect(() => toLoan({ ...loanRow, status: 'stolen' as LoanStatus })).toThrow(/status/);
});
```

If the code only casts outside input (e.g. `row.status as LoanStatus` in today's mappers), there is nothing that
throws yet. Don't write a test that passes on the cast. Report the missing validation to the user, and add it (with
its tests) only if they agree.

- **3 or more values:** use `it.each` (or a `for…of` loop over `it(...)` calls) so every value gets its own named test.
  Put the expected outcome in a table when it differs per value:
  `it.each([['going', 'Going'], ['maybe', 'Maybe'], ['no', "Can't"]] as const)('labels %s as %s', …)`.
- **1–2 values:** write separate, explicit tests.
- Put shared enum lists in `tests/helpers/enums.ts`.
- Mapping tables (`Record<Enum, …>`) are covered when every key is exercised; switch statements need every case
  **and** the `default`.

## Store tests with fake repos (integration)

```ts
import { setRepos, type Repos } from '@/data';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { useSessionStore } from '@/stores/useSessionStore';

const upsert = jest.fn(async <T>(item: T) => item);
const fakeRepos = { collection: { upsert }, cards: { save: jest.fn(async () => undefined) } } as unknown as Repos;

beforeEach(() => {
  jest.clearAllMocks();
  setRepos(fakeRepos);
  useSessionStore.setState({ status: 'signedIn', user: { id: 'me', displayName: 'You', initials: 'YO', avatarColor: 'gold' } });
  useCollectionStore.setState({ items: [], seeded: true, error: null });   // reset all state you depend on
});
afterAll(() => setRepos(null));
```
- Only fake the repo methods the flow calls; cast with `as unknown as Repos`.
- Build minimal `Card` fixtures with `makeCard` from `tests/helpers/cards.ts` (`id`, `oracle_id`, `name`, `layout`,
  `cmc`, `type_line`, `color_identity`, `legalities`, `set`, `collector_number`, `rarity`).
- Assert on store state **and** on what reached the repo (`toHaveBeenCalledWith`).
- Make the fake reject for the failure path (exception rules above).
- Mock-mode latency and the Oracle's "thinking" delay are skipped automatically when `NODE_ENV === 'test'`.

## Supabase

Three levels, cheapest first:

1. **Store and component tests never see Supabase.** They fake at the repo boundary with `setRepos(...)`, or use
   `setRepos(createMockRepos())` for a realistic in-memory backend.
2. **`src/data/supabase/supabaseRepos.ts` (integration):** mock `@/services/supabase` with `fakeSupabase()` from
   `tests/helpers/supabase.ts`. The fake is a chainable builder that can be awaited and that records calls:
   ```ts
   // tests/helpers/supabase.ts
   type Result = { data: unknown; error: { message: string } | null };
   export function fakeSupabase(results: Record<string, Result | Result[]> = {}) {
     const calls: [table: string, method: string, ...args: unknown[]][] = [];
     const next = (table: string): Result => {
       const r = results[table];
       return (Array.isArray(r) ? r.shift() : r) ?? { data: [], error: null };
     };
     const from = jest.fn((table: string) => {
       const b: Record<string, unknown> = {};
       for (const m of ['select', 'eq', 'in', 'upsert', 'insert', 'update', 'delete', 'order', 'limit', 'maybeSingle', 'single'])
         b[m] = (...args: unknown[]) => (calls.push([table, m, ...args]), b);
       b.then = (ok: (r: Result) => unknown, fail: (e: unknown) => unknown) => Promise.resolve(next(table)).then(ok, fail);
       return b;
     });
     const auth = {
       getSession: jest.fn(async () => ({ data: { session: { user: { id: 'me' } } } })),
       signInWithOtp: jest.fn(async () => ({ error: null })),
       verifyOtp: jest.fn(async () => ({ error: null })),
       signOut: jest.fn(async () => ({ error: null })),
     };
     return { client: { from, auth, functions: { invoke: jest.fn() } }, calls };
   }
   ```
   ```ts
   // tests/integration/data/supabase/supabaseRepos.test.ts
   let mockClient: unknown;
   jest.mock('@/services/supabase', () => ({ getSupabase: () => mockClient }));
   jest.mock('@/services/scryfall');   // CardRepo falls back to Scryfall for cache misses
   ```
   (Jest only lets `jest.mock` factories reference variables whose names start with `mock`.) Assert on table, filters,
   `onConflict`, chunking, that rows went through the mappers, and both `error` branches.
3. **RLS and migrations:** these can't be faked in Jest. Write pgTAP tests in `supabase/tests/*.sql` and run them with
   `supabase test db` against a local stack (`supabase start`). They are not part of `npm test`. Cover the rules
   from the vision for each table: owner can write, playgroup peer can read but not write, outsider sees nothing,
   loan requests visible only to requester and owner.

## Component tests (RTL v14)

```ts
import { fireEvent, render, screen } from '@testing-library/react-native';

await render(<Stepper value={1} min={0} max={2} onChange={onChange} label="copies in binder" />);
await fireEvent.press(screen.getByLabelText('Increase copies in binder'));
```
- `render` and `fireEvent` are **awaited** in v14.
- Query by what users perceive: `getByLabelText`, `getByRole`, `getByText`. Avoid `testID` unless nothing else works.
  If you can't query an icon button by its label, the component is missing its `accessibilityLabel`: fix the component.
- Cover every visual state the props/enums allow (e.g. owned / friend has it / missing pills; disabled at min/max).
- Components that read stores are integration tests: set the store state in `beforeEach`; don't mock the store module.
- Routes that use `expo-router`: mock it with `jest.mock('expo-router', …)` and assert on `router.push` arguments.

## Network & time
- Never hit the real network. Inject a fake `fetch` into `createScryfallClient`, fake the repo, or use `fakeSupabase`.
- For rate limiting and TTLs use `fakeClock()` (`now: () => clock.now`, `sleep` advances `clock.now`). No real timers,
  no `setTimeout` waits in tests.
- Persisted stores use the AsyncStorage mock; call `AsyncStorage.clear()` in `beforeEach` if a test depends on it.

## Bug fixes and test order
When to write the test is `superpowers:test-driven-development`'s job (and `superpowers:systematic-debugging` for
finding a bug's cause): a bug fix starts with a test that reproduces it and fails. This skill decides where that test
goes and what it covers. Name tests after behavior (`'merges repeat scans of the same printing into one stack'`), not
after functions.

## Done when
- [ ] Test files are at the mirrored path in `tests/unit/` or `tests/integration/`, chosen by the rule above, using `@/` imports.
- [ ] Every item in the scenario checklist that applies is covered.
- [ ] Every `throw` / `reject` / error-to-state `catch` has a valid-input and an invalid-input test, with the message asserted.
- [ ] Every value of every enum the code branches on is tested (`it.each` for 3+), with the value list checked by `tsc`.
- [ ] `npm run test:coverage` passes the thresholds; touched files meet their folder's bar on their own.
- [ ] No real network, no real timers, no state leaking between tests (stores and `setRepos` reset).
- [ ] `npm test` and `npx tsc --noEmit` pass (part of the `preflight` skill).
