---
name: scryfall
description: Work with Magic card data from the Scryfall API in Spellbinder — searching, fuzzy name lookup, batch imports, printings, images and double-faced cards, art credit, caching and rate limits. Use whenever code fetches, stores, displays or imports card data, or touches src/services/scryfall*.ts or src/utils/cards.ts.
argument-hint: <card-data task>
---

# Scryfall card data

All card data and images come from Scryfall. We never host card images ourselves. Docs: https://scryfall.com/docs/api
(check them when using an endpoint that's new to the codebase).

## The one rule: go through the shared client
- App code: `import { search, getNamedFuzzy, … } from '@/services/scryfall'` — one app-wide instance, so the rate limits
  and the cache are shared. Better still, call it from a **repository** (`CardRepo` in `src/data/repositories.ts`), never
  from a screen.
- Node scripts and tests: `createScryfallClient({ fetch, userAgent })` from `src/services/scryfallClient.ts`
  (no React Native imports; see `scripts/build-seed-cards.ts`).
- Never `fetch('https://api.scryfall.com/…')` directly. Image URLs (`*.scryfall.io`) are loaded by `expo-image` and
  aren't rate limited.

What the client already handles (don't reimplement): a serial queue, **500 ms** spacing for
`/cards/search|named|random|collection` and **100 ms** for everything else (stricter than the 50–100 ms in CLAUDE.md —
the client follows Scryfall's current published limits), a 30 s pause after a 429 with no retry loop, `User-Agent` +
`Accept` headers (no UA on web — browsers forbid it), a 24 h memory + AsyncStorage cache with in-flight de-duplication,
and 404 → empty list for searches.

## Pick the right endpoint
| Task | Function | Notes |
|---|---|---|
| Typeahead | `autocomplete(q)` | Needs ≥ 2 chars; debounce in the UI (~250 ms). |
| Scan / typed name | `getNamedFuzzy(name)` / `getNamedExact(name)` | Fuzzy for OCR output; 404 = no match → `null` in the repo. |
| Filtered search | `search(q, { unique, order, dir, page })` | Full Scryfall syntax, e.g. `id<=wubg f:commander t:legendary t:creature`. Paginate with `has_more`. |
| Many known cards (imports, hydration) | `getCollection(identifiers)` | Batches of 75; identifiers `{id}`, `{oracle_id}`, `{name}`, `{name, set}`, `{set, collector_number}`; returns `notFound`. |
| All printings | `getPrintings(cardId)` | `oracleid:` search, `unique=prints`, newest first. |
| One printing | `getById(id)` | |
| Thousands of cards / full sync | **bulk data** (`/bulk-data`, `oracle_cards` or `default_cards`) | Download once (server-side or a script), not card-by-card. Add it to the client if you need it. |

Add a new endpoint as a function inside `createScryfallClient` (so it shares the queue and cache), export it from
`scryfall.ts`, and add a test to `src/services/__tests__/scryfallClient.test.ts`.

## Card shape & identity
- Store and pass `slimCard(card)` (`src/utils/cards.ts`) — only the fields in `ScryfallCard` (`src/types/scryfall.ts`)
  and the `cards` / `card_versions` tables. Caching full Scryfall objects bloats AsyncStorage.
- **Printing `id`** = our `versionId` → collection items. **`oracle_id`** = our `cardId` → deck cards, loans, ownership.
  Always read the card id with
  `getCardId(card)` — reversible cards only have it on their faces.
- Repos cache what they fetch: `CardRepo.save()` (Supabase: upsert `cards`, then `card_versions`); stores use
  `useCardStore` (`put`, `ensureIds`) as the local cache.

## Images
- `getImageUri(card, size, face)` handles size fallbacks and double-faced cards (images in `card_faces[].image_uris`;
  split and adventure cards share the top-level `image_uris`). `getCardFaces(card)` gives the faces to render.
- Render with `CardImage`: `variant="card"` = the full card at 63:88, `contain`, never cropped. `variant="art"` = `art_crop`.
- **Wherever `art_crop` is shown, show the artist** (`getArtist(card, face)`, `showCredit` / `ArtCredit`).
- Never crop, distort, recolor or watermark card images, and don't strip the copyright line.

## Offline & mock mode
Mock repos still call the real client and fall back to the bundled catalog (`src/data/mock/catalog.ts`) when offline.
Seed cards come from `npm run seed:cards` (see the `seed-data` skill). UI must render the tinted placeholder when there's
no image.

## Done when
- [ ] No direct Scryfall `fetch`; new endpoints live in the client, with a test.
- [ ] Version id vs card id used correctly; `slimCard` before caching or storing.
- [ ] DFCs render (face images), art crops show the artist.
- [ ] The `preflight` skill passes.
