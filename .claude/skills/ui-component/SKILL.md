---
name: ui-component
description: Build or change Spellbinder screens and UI components to the design system — theme tokens, Text variants, Pill/Chip/Button/IconButton/Icon, CardImage with artist credit, screen shells and headers, accessibility. Use for any visual work in app/ or src/components/, including adding a new icon glyph or theme token.
argument-hint: <component or screen to build>
---

# UI component / screen

Build `$ARGUMENTS` so it looks like the rest of Spellbinder: dark, fantasy, sleek. The spec is `docs/VISION.md` §4
(screens) and §5 (design system) — read the section for the screen you're touching. Reference screen:
`app/(tabs)/decks.tsx`.

## Use the primitives first
Import from `@/components/ui` (`src/components/ui/index.ts`) before writing anything new:

| Need | Use |
|---|---|
| Any text | `Text` with `variant` = display · title · heading · number · body · bodyStrong · label · caption · eyebrow, and `tone` = primary · secondary · tertiary · muted · gold · goldSoft · ink · friend · missing · success |
| Buttons | `Button` (primary gold / secondary / ghost), `IconButton` (variants surface · gold · oracle · ghost · scrim · active; `accessibilityLabel` is required) |
| Status | `Pill` (owned = gold check · friend = "Jonas has it" · missing · success · neutral), `Chip` (default · gold · friend · success · missing) |
| Layout | `Screen` (`withTabBar` on tab screens, `safeTop={false}` under a full-bleed hero), `Card`, `SectionHeader`, `Sheet` (bottom sheet) |
| Cards | `CardImage` (`variant="card"` keeps the 63:88 image uncropped; `variant="art"` = art_crop, so pass `showCredit` or render `ArtCredit` nearby), `ManaPips`, `ManaCost` |
| Other | `SegmentedControl`, `ProgressBar`, `Stepper`, `Avatar`/`AvatarStack`, `Sigil`, `Toast`, `Icon` |

Headers: `ScreenHeader` (`src/components/navigation/`) with `actions`, and `OracleButton` as the last action on every
main screen. Feature components go in `src/components/<area>/` (home, decks, binder, card, scan, playgroup, oracle, search).

## Tokens only — `src/theme`
- Colors: `colors.*`, `manaColors`, `identityTint(identity)`, `avatarColors`. **Never** write a hex or `rgb()` literal in
  `app/` or `src/components/` (ESLint fails the build). Need a new color? Add a named token in `src/theme/colors.ts`
  that matches VISION §5, then use it.
- Spacing `spacing.xxs…xxxl` (2–32), radii `radii.chip/sm/md/lg/xl/xxl/bar/sheet`, `layout.screenPadding` (20),
  `layout.sectionGap`, `layout.gridGap`, `layout.minTouch` (44), `layout.cardAspect` (63/88), `shadows.*`.
- Fonts: custom fonts ignore `fontWeight`; use `typography.*` or a `Text` variant, never `fontWeight: 'bold'`.
  Cinzel for titles, deck/card names and big numbers; Manrope for everything else.
- Styles via `StyleSheet.create` at the bottom of the file; inline styles only for values that really vary.

## Icons
Inline stroke SVG in `src/components/ui/Icon.tsx` (24×24 viewBox, stroke only, `filled` for closed shapes). To add one:
extend the `IconName` union and add a `case` in `glyph()`. No emoji, no icon fonts, no brand marks.

## Accessibility (hard rules)
- Touch targets ≥ 44 pt (`layout.minTouch`; use `hitSlop` when the visual is smaller).
- Every icon-only control has an `accessibilityLabel`; use `accessibilityRole` / `accessibilityState` for toggles,
  tabs and selected chips.
- Text contrast ≥ 4.5:1 — `textMuted` is the lowest tone allowed on `surface`. Don't put muted text on `surfaceRaised`
  at caption size without checking.
- Respect reduce motion: gate decorative animation with `useReduceMotion()` (`src/components/ui/useReduceMotion.ts`).

## Card images & credit (Scryfall rules)
Never crop, stretch or watermark a full card image. When you show `art_crop`, show the artist name nearby
(`showCredit` / `ArtCredit`). Offline or still loading → the tinted placeholder from `CardImage`, never a blank box.

## Screens
- Tab screens: `<Screen withTabBar>` so content clears the floating bar. Detail routes keep the bar visible
  (`DetailTabBar`); `scan` is full screen with no bar, on `colors.bgCamera`.
- Screens read stores and hooks (`@/stores/hooks`) only — no fetching, no business logic (see `feature-slice`).
- Show loading, empty and error states with real copy (look at the empty states in `decks.tsx`).

## Done when
- [ ] Matches the VISION section for this screen (run the `vision-review` skill for a full screen).
- [ ] No raw colors, no `fontWeight` on custom fonts, no emoji.
- [ ] Labels, roles and 44-pt targets in place; component test for new interactive behavior (`write-tests`).
- [ ] The `preflight` skill passes.
