import type { ManaColor } from '@/theme/colors';

export const WUBRG: readonly ManaColor[] = ['W', 'U', 'B', 'R', 'G'];

export const COLOR_NAMES: Record<ManaColor, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
};

export function isManaColor(value: string): value is ManaColor {
  return value === 'W' || value === 'U' || value === 'B' || value === 'R' || value === 'G' || value === 'C';
}

/** Colors in canonical WUBRG order; an empty identity becomes colorless. */
export function sortColors(colors: readonly string[]): ManaColor[] {
  const sorted = WUBRG.filter((c) => colors.includes(c));
  return sorted.length > 0 ? sorted : ['C'];
}

/** "{2}{G}{G}" → ["2", "G", "G"]. Double-faced costs ("{1}{U} // {3}{U}") use the front face. */
export function parseManaCost(cost: string | undefined): string[] {
  if (!cost) return [];
  const front = cost.split(' // ')[0];
  return Array.from(front.matchAll(/\{([^}]+)\}/g), (match) => match[1]);
}
