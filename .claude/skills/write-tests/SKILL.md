---
name: write-tests
description: Write Jest tests for Spellbinder the way the codebase already does — pure selector/util tests, Zustand store flows with fake repositories, React Native component tests with Testing Library, and Scryfall client tests with a fake clock. Use when adding tests for new code, fixing a bug (write the failing test first), or when asked to improve coverage.
argument-hint: <what to test>
---

# Writing tests

Stack: `jest-expo` preset, `@testing-library/react-native` v14, config in the `jest` block of `package.json`
(`@/` → `src/`, `jest.setup.ts` mocks AsyncStorage, `supabase/` is ignored). Run one file with
`npx jest path/to/file`, everything with `npm test`.

Put tests in a `__tests__/` folder next to the code: `src/<area>/__tests__/<name>.test.ts(x)`.

## Pick the cheapest test that proves it
1. **Pure functions** (`src/utils`, `src/stores/selectors`) — plain inputs/outputs, no mocks.
   Examples: `src/utils/__tests__/cards.test.ts`, `src/stores/selectors/__tests__/ownership.test.ts`.
2. **Store flows** — drive the store through `getState()` with fake repos. Example: `src/stores/__tests__/useScanStore.test.ts`.
3. **Components** — render, press, assert on what the user sees or hears. Example: `src/components/ui/__tests__/Stepper.test.tsx`.
4. **Service clients** — inject `fetch`, `now`, `sleep`, `storage`. Example: `src/services/__tests__/scryfallClient.test.ts`.
5. **Seed integrity** — `src/data/mock/__tests__/seedIntegrity.test.ts` (see the `seed-data` skill).

## Store tests with fake repos
```ts
import { setRepos, type Repos } from '@/data';

const upsert = jest.fn(async <T>(item: T) => item);
const fakeRepos = { collection: { upsert }, cards: { save: jest.fn(async () => undefined) } } as unknown as Repos;

beforeEach(() => {
  jest.clearAllMocks();
  setRepos(fakeRepos);
  useSessionStore.setState({ status: 'signedIn', user: { id: 'me', displayName: 'You', initials: 'YO', avatarColor: 'gold' } });
  useCollectionStore.setState({ items: [], seeded: true });   // reset state you depend on
});
afterAll(() => setRepos(null));
```
- Only fake the repo methods the flow calls; cast with `as unknown as Repos`.
- Build minimal `Card` fixtures by hand (`id`, `oracle_id`, `name`, `layout`, `cmc`, `type_line`, `color_identity`,
  `legalities`, `set`, `collector_number`, `rarity`) — see `makeCard` in the scan store test.
- Assert on store state **and** on what reached the repo (`toHaveBeenCalledWith`).
- Test the failure path: make the fake reject and check the store's `error`.
- Mock-mode latency and the Oracle's "thinking" delay are skipped automatically when `NODE_ENV === 'test'`.

## Component tests (RTL v14)
```ts
import { fireEvent, render, screen } from '@testing-library/react-native';

await render(<Stepper value={1} min={0} max={2} onChange={onChange} label="copies in binder" />);
await fireEvent.press(screen.getByLabelText('Increase copies in binder'));
```
- `render` and `fireEvent` are **awaited** in v14.
- Query by what users perceive: `getByLabelText`, `getByRole`, `getByText`. Avoid `testID` unless nothing else works.
  If you can't query an icon button by its label, the component is missing its `accessibilityLabel` — fix the component.
- Components that read stores: set the store state in `beforeEach` instead of mocking the store module.
- Screens that use `expo-router`: test the component below the route, or mock `router` with `jest.mock('expo-router', …)`.

## Network & time
- Never hit the real network in tests. Inject a fake `fetch` into `createScryfallClient`, or fake the repo.
- For rate limiting and TTLs use the fake clock pattern (`now: () => clock.now`, `sleep` advances `clock.now`).
- Persisted stores use the AsyncStorage mock; call `AsyncStorage.clear()` in `beforeEach` if a test depends on it.

## Bug fixes
Write the test that reproduces the bug first, watch it fail, then fix it. Name tests after behavior
(`'merges repeat scans of the same printing into one stack'`), not after functions.

## Done when
- [ ] New logic covered at the cheapest level that proves it; failure paths included.
- [ ] No real network, no timing flakiness, no shared state leaking between tests.
- [ ] `npm test` passes (part of the `preflight` skill).
