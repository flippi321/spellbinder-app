/**
 * Design tokens from docs/VISION.md §5. This is the only place in the app where raw color
 * values live — components import tokens from `@/theme` (enforced by ESLint).
 */
export const colors = {
  bg: '#0B0A0F',
  bgCamera: '#050407',
  surface: '#16141C',
  surfaceRaised: '#1E1B26',
  surfaceGold: '#1A1610',
  surfaceOracle: '#14121A',

  border: '#2A2633',
  borderStrong: '#3A3542',
  borderGold: '#4A4232',

  text: '#EEE8DA',
  textSecondary: '#CFC8B8',
  textTertiary: '#B8B0A0',
  textMuted: '#A8A08F',

  gold: '#D4AF6A',
  goldInk: '#1A150C',
  goldSoftBg: '#2A2418',
  goldSoftText: '#F0DDB2',

  friendBg: '#1E2A3A',
  friendText: '#A9C8EE',
  missingText: '#E5B77A',
  missingBorder: '#5A4A30',
  successBg: '#1C2A22',
  successText: '#A7D9B7',

  tabBar: 'rgba(23,21,29,0.94)',
  tabInactive: '#948D7E',

  white: '#FFFFFF',
  shadow: '#000000',
  /** Backdrop behind sheets and modals. */
  overlay: 'rgba(5,4,7,0.72)',
  /** Solid-ish chip behind floating buttons/credits that sit on top of card art. */
  scrim: 'rgba(11,10,15,0.72)',
  /** Thin viewfinder outline on the camera screen. */
  viewfinderLine: 'rgba(238,232,218,0.18)',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;

export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

/** Mana pips: letter in a circle with a 1-pt 22% white border. */
export const manaColors: Record<ManaColor, { fill: string; ink: string }> = {
  W: { fill: '#EADFB8', ink: '#2A2418' },
  U: { fill: '#2F6FB8', ink: '#FFFFFF' },
  B: { fill: '#3A3542', ink: '#EEE8DA' },
  R: { fill: '#B8432E', ink: '#FFFFFF' },
  G: { fill: '#2E7A4A', ink: '#FFFFFF' },
  C: { fill: '#6E6878', ink: '#FFFFFF' },
};
export const pipBorder = 'rgba(255,255,255,0.22)';

/** Color-identity tints for art placeholders. */
export const identityTints: Record<ManaColor | 'multi', string> = {
  W: '#2A2720',
  U: '#172334',
  B: '#1D1A22',
  R: '#2C1A16',
  G: '#172619',
  C: '#222026',
  multi: '#2A2416',
};

/** Hand-picked banner tints for specific identities (keys in WUBRG order). */
const bannerTints: Record<string, string> = {
  WUBG: '#1B2620', // Atraxa
  R: '#2B1915', // Krenko
  UBG: '#18212A', // Muldrotha
  WBR: '#261619', // Edgar
};

const WUBRG: ManaColor[] = ['W', 'U', 'B', 'R', 'G'];

/** Placeholder tint for a card or deck with the given color identity. */
export function identityTint(identity: readonly string[]): string {
  const known = WUBRG.filter((c) => identity.includes(c));
  if (known.length === 0) return identityTints.C;
  if (known.length === 1) return identityTints[known[0]];
  return identityTints.multi;
}

/** Deck banner tint: a hand-picked tint when we have one, else the identity tint. */
export function bannerTint(identity: readonly string[]): string {
  const key = WUBRG.filter((c) => identity.includes(c)).join('');
  return bannerTints[key] ?? identityTint(identity);
}

export type AvatarColor = 'gold' | 'blue' | 'green' | 'red' | 'violet';

/** Member avatar palette. Profiles store the key (VISION §6 `avatar_color`). */
export const avatarColors: Record<AvatarColor, { bg: string; ink: string }> = {
  gold: { bg: '#3A3020', ink: '#F0DDB2' },
  blue: { bg: '#1E2A3A', ink: '#A9C8EE' },
  green: { bg: '#1C2A22', ink: '#A7D9B7' },
  red: { bg: '#3A201C', ink: '#F2BBA8' },
  violet: { bg: '#2A2238', ink: '#CFC0F0' },
};
