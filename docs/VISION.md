# Spellbinder — Product & Design Vision

## 1. What we're building

Spellbinder is a **Commander-first** Magic: The Gathering companion app for a group of about five friends. It is free,
built for fun, and never monetized. Similar apps exist (Moxfield, Archidekt, ManaBox); our edge is that Spellbinder
**knows what you and your friends actually own** and uses that everywhere — and later an AI "Oracle" gives advice
grounded in your real collection.

Core ideas:

1. **Your binder is the source of truth.** Every deck view shows what you own, what a friend owns, and what's missing.
2. **The playgroup is a first-class feature.** Borrow before you buy, see who has a card, plan game nights.
3. **Scanning makes it effortless.** Point the camera at a card and it's in your binder in two taps.
4. **The Oracle is the edge.** Deck reviews, commander ideas and combo finding based on cards you own (added later).

Platforms: this repo is the **mobile app** (iOS + Android via Expo). A separate website exists in the design but is
out of scope for now.

## 2. Feature scope

### MVP (this boilerplate should scaffold all of it, backed by mock data)
- **Home** — game-night strip, at-a-glance tiles, your decks.
- **Decks** — list with filters; deck detail with categories, ownership status, stats (mana curve, types).
- **Binder (collection)** — grid of owned cards with color/type/spare/foil filters; card detail.
- **Scan** — camera viewfinder, capture, detected-card sheet, add to binder or a deck, session tray.
- **Playgroup** — members, game night + RSVP, wins leaderboard, borrow requests, loans, "Who has it?".
- **Oracle** — chat UI with three suggested prompts and pre-written test answers (no real AI yet).

### Later
- Real OCR for scanning (needs a dev build + native text recognition).
- Real Oracle via Supabase Edge Function calling the Claude API with structured deck/collection context.
- Combo detection via Commander Spellbook; CSV/text-list imports; Commander Brackets support; price data.
- Website (separate design exists).

## 3. Navigation

- Floating **bottom bar** (rounded, hovers above content) with four tabs and a raised center button:
  **Home · Decks · [Scan] · Binder · Group**.
- **Scan** is a full-screen modal route (no tab bar) opened by the gold center button.
- **Oracle** is not a tab. It opens from a gold sparkle icon button in the top-right header of every main screen,
  as a full-screen route with a back button.
- Detail routes: `deck/[id]`, `card/[id]`. Both keep the bottom bar visible.

Suggested route map (Expo Router):
```
app/
  _layout.tsx            root stack, fonts, theme, providers
  (tabs)/_layout.tsx     tabs with the custom floating TabBar
  (tabs)/index.tsx       Home
  (tabs)/decks.tsx       Decks list
  (tabs)/binder.tsx      Collection
  (tabs)/group.tsx       Playgroup
  deck/[id].tsx          Deck detail
  card/[id].tsx          Card detail
  scan.tsx               Scanner (fullScreenModal, no tab bar)
  oracle.tsx             Oracle chat (full screen)
```

## 4. Screens (match these designs)

**Home** (vertical scroll; content padded so it clears the floating bar)
1. Header: Spellbinder sigil, "Good evening" (small) / "Planeswalker" (Cinzel), Oracle button, avatar.
2. Game-night strip: date badge (THU / 19:00), "Game night at Jonas's", "4 of 5 going", green "Going" pill.
3. **At a glance** (section title) — 2×2 tiles: "1,284 cards in your binder" → Binder; "3 cards friends own fit
   your decks" → Group; "1 card from a combo in Edgar" → Oracle; gold Oracle tip "A commander hides in your binder" → Oracle.
4. **Your decks** (section title + "See all") — 2×2 grid of deck tiles: art banner tinted by color identity with
   mana pips, short name, ownership progress bar, "6 missing" / "Complete".

**Decks** — title + Oracle button + gold "new deck" button; segmented control All / Need cards / Complete;
large deck cards (art banner, pips, "Bracket 3" chip, name, theme, progress bar, "94% owned · 6 missing").

**Deck detail** — 250-pt hero banner (commander art via Scryfall `art_crop`, artist credit) with floating back and
Oracle buttons; pips, name, chips (Bracket, 100 cards, % owned, Legal); buttons "Scan into deck" (gold) and
"Search cards"; tabs **Cards / Stats**. Cards = accordion of categories (Ramp, Card draw, Removal, Counters &
proliferate, Lands…) with rows showing a gold check (owned), blue "Jonas has it" pill (friend owns), or orange
"Missing" pill. Stats = mana-curve bar chart, owned / in group / missing counts.

**Binder** — title "Binder" with "1,284 cards · 618 spare · 64 foils", Oracle and import buttons, search, six
color filter circles (W U B R G C, multi-select), horizontal type chips (All, Spare, Foils, Creatures, Instants,
Artifacts, Lands), "Showing N of M", 2-column grid of card tiles (63:88 ratio image, ×qty · foil, "Spare" blue
chip or "In 2 decks"). Foil cards get a gold-tinted border.

**Card detail** — large card image, name, "Commander legal" chip, type line, oracle text panel; "In your binder"
row with − / count / + stepper; "In your decks" chips; friend avatars "Jonas, Mira and Erik own it too";
buttons "Other printings" and gold "Add to deck".

**Scan** (full screen, near-black) — top: close button, "Add to: Binder ▾" pill (toggles binder / a deck), flash
toggle. Center: card-shaped viewfinder (63:88) with gold corner brackets and an animated scan line. Hint text
under it. Bottom: "N scanned" session tray of mini thumbnails, "Type it" (manual search), big shutter button, "Done"
(→ Binder). After capture a bottom sheet slides up: "Card found · 98% match", name, "You own 2 · in 4 decks",
Foil toggle, "Change printing", quantity stepper, "Rescan" and gold "Add 1 to binder". Adding shows a green toast
"Added 1× Sol Ring", appends to the session tray and returns to scanning.

**Playgroup** — eyebrow "Playgroup", title "The Thursday Table", Oracle and invite buttons, horizontal member
avatars, segmented control **Game night / Lending / Who has it**.
Game night: next game card (Thursday · 19:00, at Jonas's, "N of 5 going") with Going / Maybe / Can't RSVP;
"Wins this season" bar leaderboard; "Log a game". Lending: incoming request ("Jonas wants to borrow Rhystic Study")
with Decline / Lend it; "On loan" list with Borrowed / Lent tags. Who has it: search field and results list with "Ask".

**Oracle** — header with back button, sparkle tile, "Oracle", "Test data · preview", new-chat button.
Scrolling chat thread (user bubbles right in dark gold; Oracle replies left with a sparkle avatar). Oracle answers
are rich: intro paragraph, optional featured-commander card, titled sections with paragraphs and **card chips**
(name + note like "Spare in your binder" in grey or "Jonas has one" in blue), and a gold primary action.
Composer pinned to the bottom: a horizontal row of suggestion chips **above** the input, then input + gold send.
Tapping a suggestion sends it, shows "Consulting your binders…" for ~1 s, then posts the answer. Free-typed questions
get: "In this preview I can only answer the suggested questions…".

The three suggestions and their test answers:
1. **"Do you have any improvements on my Atraxa deck?"** — Atraxa is in good shape (94% owned). *Ramp is a little
   thin:* 8 ramp pieces, ~10 is safer; chips Fellwar Stone, Rampant Growth (spare in binder). *Some cards ignore
   Atraxa:* Mystic Remora does nothing with counters; Inspiring Call keeps the draw and rewards counters; chips
   Inspiring Call (spare), Karn's Bastion (Sanna has one). Action: "Apply these swaps".
2. **"Given my cards, do you have any cool commanders?"** — your binder hides a mill theme (41 mill cards). Featured
   commander **The Wise Mothman** (U/B/G, 3/3 flying, "In your binder · in no deck"). *Why:* whenever nonland cards
   are milled by any player he spreads +1/+1 counters across your creatures; his rad counters make the whole table
   mill each turn, so he feeds himself. *Builds on what you love:* same colors as Muldrotha, counter cards from Atraxa.
   Chips Stitcher's Supplier, Ruin Crab, Hardened Scales, Winding Constrictor (Jonas has one). Action: "Start a Mothman deck".
3. **"Are there any combos hiding in my collection?"** — Exquisite Blood + Sanguine Bond is an infinite drain; you own
   Exquisite Blood (in Edgar), Mira has Sanguine Bond. Skullclamp is a spare, very strong engine for Krenko
   (check Bracket 2 comfort). Action: "Ask Mira for Sanguine Bond".

## 5. Design system

Look: **dark, fantasy, but sleek and modern.** Obsidian backgrounds, warm parchment text, antique-gold accent,
carved-serif headings, clean sans UI, generous rounding. No gradients-as-decoration, no emoji.

Colors:
| Token | Hex | Use |
|---|---|---|
| bg | #0B0A0F | app background |
| bgCamera | #050407 | scanner |
| surface | #16141C | cards, panels |
| surfaceRaised | #1E1B26 | selected/raised items, chips |
| surfaceGold | #1A1610 / #14121A | Oracle-flavored panels |
| border | #2A2633 | default hairlines |
| borderStrong | #3A3542 | secondary buttons |
| borderGold | #4A4232 | gold-tinted outlines |
| text | #EEE8DA | primary text |
| textSecondary | #CFC8B8 / #B8B0A0 | secondary text |
| textMuted | #A8A08F | captions (min contrast on surface) |
| gold (accent) | #D4AF6A | primary buttons, active tab, highlights |
| goldInk | #1A150C | text on gold |
| goldSoftBg / goldSoftText | #2A2418 / #F0DDB2 | selected segmented items, user chat bubbles |
| friendBg / friendText | #1E2A3A / #A9C8EE | "a friend has it", spare chips |
| missingText / missingBorder | #E5B77A / #5A4A30 | "Missing" pills |
| successBg / successText | #1C2A22 / #A7D9B7 | Legal, Going, toasts |

Mana pips (letter in a circle, 1-pt white 22% border): W #EADFB8 / ink #2A2418 · U #2F6FB8 / white ·
B #3A3542 / #EEE8DA · R #B8432E / white · G #2E7A4A / white · C #6E6878 / white.
Color-identity tints for art placeholders: W #2A2720, U #172334, B #1D1A22, R #2C1A16, G #172619, C #222026,
multicolor #2A2416; deck banners e.g. Atraxa #1B2620, Krenko #2B1915, Muldrotha #18212A, Edgar #261619.

Type: Cinzel 600/700 for titles, deck and card names, big numbers (sizes 14–28). Manrope 400–700 for everything
else (11–16). Eyebrow labels: 11–12 pt, uppercase, letter-spacing ~0.14em.
Radii: chips 999, small 10–12, cards 16–22, bottom bar 26, sheets 28 (top corners).
Spacing: screen padding 20, section gap 18–22, grid gap 10–14.
Bottom bar: 68 pt tall, 16 pt side inset, 20 pt from bottom (plus safe area), rgba(23,21,29,0.94) with blur,
1-pt border, soft shadow; inactive icon/label #948D7E, active gold with a 4-pt dot; center Scan button 64 pt gold
circle raised ~30 pt with a 5-pt ring in the bg color.
Brand sigil: circle, inscribed diamond, small center circle (stroke only).

## 6. Data model (Supabase)

- `profiles` (id = auth user id, display_name, initials, avatar_color)
- `playgroups` (id, name, invite_code, created_by)
- `playgroup_members` (playgroup_id, user_id, role)
- `cards` — slim Scryfall cache: scryfall_id (pk), oracle_id, name, mana_cost, cmc, type_line, oracle_text,
  colors, color_identity, legalities (jsonb), image_uris (jsonb), card_faces (jsonb), set, collector_number, artist, updated_at
- `collection_items` (id, user_id, scryfall_id, oracle_id, quantity, foil, condition, created_at)
- `decks` (id, owner_id, name, commander_oracle_id, partner_oracle_id null, theme, bracket, created_at)
- `deck_cards` (deck_id, oracle_id, quantity, category, is_commander)
- `loan_requests` (id, card_oracle_id, requester_id, owner_id, status: pending|lent|declined|returned, note, created_at)
- `game_nights` (id, playgroup_id, starts_at, location, notes) · `rsvps` (game_night_id, user_id, status: going|maybe|no)
- `games` (id, playgroup_id, played_at, winner_id, winner_commander_oracle_id, player_count, duration_minutes)

RLS: users edit only their own collection/decks; members of the same playgroup can **read** each other's
collection and decks; loan requests visible to requester and owner.

## 7. Integrations

- **Scryfall** — `/cards/autocomplete`, `/cards/search?q=` (full search syntax), `/cards/named?fuzzy=` (scan
  matching), `/cards/{id}`, `/cards/collection` (batch lookups for imports), bulk-data for big syncs. Double-faced
  cards keep images in `card_faces[].image_uris`. Respect rate limits and caching (see CLAUDE.md).
- **Scan pipeline** — camera capture → `recognizeCardName(imageUri)` (adapter; mock now, on-device OCR later) →
  Scryfall fuzzy lookup → confirmation sheet → add to collection or deck.
- **Oracle** — `askOracle(question, context)` adapter. Mock returns the three canned answers. Real implementation
  calls the Supabase Edge Function `oracle`, which builds structured context (commander, decklist with categories,
  owned/friend-owned cards) and calls the Claude API server-side.

## 8. Sample data (seed for mock mode)

- You (YO), Jonas (JO), Mira (MI), Erik (ER), Sanna (SA) — playgroup "The Thursday Table".
- Decks: Atraxa, Praetors' Voice (WUBG, bracket 3, 94% owned, 6 missing); Krenko, Mob Boss (R, bracket 2,
  complete); Muldrotha, the Gravetide (UBG, bracket 3, 88%, 12 missing); Edgar Markov (WBR, bracket 3, 95%, 5 missing).
- Atraxa categories — Ramp (8): Sol Ring, Arcane Signet, Cultivate, Farseek, Smothering Tithe (Jonas has it)…;
  Card draw (9): Rhystic Study, Phyrexian Arena, Sylvan Library (missing)…; Removal (8): Swords to Plowshares,
  Beast Within, Toxic Deluge (missing)…; Counters & proliferate (14): Doubling Season (Erik has it), Hardened
  Scales, Evolution Sage…; Lands (35): Command Tower, Breeding Pool, Watery Grave (missing)…
- Binder samples: Arcane Signet ×3, Blood Artist ×2, Command Tower ×4, Counterspell ×3 (1 foil, spare), Cultivate ×3,
  Krenko ×1 (foil), Path to Exile ×2 (1 foil), Skullclamp ×1 (spare), Sol Ring ×2 (1 foil, in 4 decks),
  The Wise Mothman ×1 (spare).
- Game night: Thursday 19:00 at Jonas's; wins this season Mira 7, Jonas 5, You 4, Erik 3, Sanna 2 (21 games).
- Loans: borrowed Cyclonic Rift from Erik; lent Lightning Greaves to Mira. Pending: Jonas wants Rhystic Study.

Mock data should use real card names; fetch real Scryfall data for them when online, and fall back to tinted
placeholders when offline.
