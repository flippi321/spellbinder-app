---
name: vision-review
description: Review a Spellbinder screen or feature against the product and design vision in docs/VISION.md — layout, copy, navigation, design tokens, sample numbers and behavior — and list every mismatch with file:line. Use when asked whether a screen "matches the design", after building or changing a screen, or before a demo. Read-only unless --fix is passed.
argument-hint: <screen or feature> [--fix]
---

# Vision review

Review `$ARGUMENTS` against `docs/VISION.md`. Report only, unless the arguments include `--fix`. With `--fix`, apply
the must-fix items (and nice-to-haves if they're small), then run the `preflight` skill.

## 1. Gather
- The VISION sections that apply: §3 Navigation, the screen's paragraph in §4, §5 Design system, §8 sample data
  (for numbers and names on screen). For the Oracle, also the three canned answers in §4.
- The route in `app/` and every component it renders (follow the imports into `src/components/`).
- The stores and selectors that feed the numbers (`src/stores/hooks.ts`, `src/stores/selectors/`).

## 2. Check, in this order
1. **Structure** — every element the vision lists is there, in the listed order (header pieces, sections, tabs,
   segmented options, buttons). Note anything extra that the vision doesn't have.
2. **Copy** — exact labels and microcopy ("At a glance", "See all", "Need cards", "Jonas has it", "Missing",
   "Add 1 to binder", "Consulting your binders…"). Casing, punctuation (typographic apostrophes/ellipses as used in the code).
3. **Navigation** — floating bar on tab and detail routes; Scan is a full-screen modal without the bar; the Oracle
   button sits top-right on every main screen and opens `/oracle`; back buttons where specified; tiles link where §4 says.
4. **Design tokens** — the right surface/border/text tokens per the §5 table; Cinzel vs Manrope usage; eyebrow style;
   radii (chips 999, cards 16–22, sheets 28); screen padding 20, section gap 18–22, grid gap 10–14; foil = gold-tinted
   border; mana pip colors; identity tints for placeholders and deck banners.
5. **Data** — numbers come from selectors, not hard-coded strings, and match §8 in mock mode (94% owned · 6 missing,
   1,284 cards · 927 spare · 64 foils, 4 of 5 going, leaderboard order).
6. **States & behavior** — loading, empty, error and offline (tinted placeholders); interactions the vision describes
   (filters multi-select, steppers, RSVP, lend/decline, scan sheet → toast → session tray, Oracle suggestion chips
   above the input with a ~1 s thinking state).
7. **Accessibility** — labels on icon buttons, 44-pt targets, contrast (no `textMuted` below caption contrast),
   reduce motion respected for the scan line and other decorative animation.
8. **Hard rules that show up visually** — art crops credit the artist; full card images are never cropped; no emoji.

## 3. Report
Group by severity. Each item: what VISION says → what the code does → where.
```
Vision review — Binder (app/(tabs)/binder.tsx)

Must fix
- Type chips: vision lists All, Spare, Foils, Creatures, Instants, Artifacts, Lands; code is missing "Instants"
  → src/components/binder/...:42
Nice to have
- "Showing N of M" uses caption/muted; vision implies label weight → app/(tabs)/binder.tsx:88
Matches
- Header, search, color filters, 2-column 63:88 grid, foil border
```
- **Must fix:** missing or wrong elements, wrong copy, broken navigation, hard-rule or accessibility violations,
  wrong numbers.
- **Nice to have:** spacing or tone drift, small polish.
- If the vision is ambiguous or seems out of date with a deliberate code decision, say so and ask — don't silently
  "fix" toward the doc. Product decisions belong to the user; propose a VISION.md edit instead.
