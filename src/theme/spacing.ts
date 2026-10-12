export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Chips 999, small 10–12, cards 16–22, bottom bar 26, sheets 28 (top corners). */
export const radii = {
  chip: 999,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 22,
  bar: 26,
  sheet: 28,
} as const;

export const layout = {
  screenPadding: 20,
  sectionGap: 20,
  gridGap: 12,
  /** Minimum touch target (CLAUDE.md accessibility rule). */
  minTouch: 44,
  /** Physical card ratio, width / height. */
  cardAspect: 63 / 88,
  heroHeight: 250,
  tabBar: {
    height: 68,
    sideInset: 16,
    bottomOffset: 20,
    scanSize: 64,
    scanRaise: 30,
    scanRing: 5,
    dot: 4,
  },
} as const;

export const shadows = {
  bar: '0px 10px 30px rgba(0,0,0,0.45)',
  sheet: '0px -8px 30px rgba(0,0,0,0.5)',
  raised: '0px 6px 18px rgba(0,0,0,0.35)',
  /** Gold glow on the scanner's sweep line. */
  scanLine: '0px 0px 12px rgba(212,175,106,0.8)',
} as const;
