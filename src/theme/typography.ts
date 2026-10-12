import type { TextStyle } from 'react-native';

import type { FontFamily } from './fonts';

type TypeStyle = TextStyle & { fontFamily: FontFamily };

/**
 * Custom fonts ignore `fontWeight`, so every style names the exact family for its weight.
 * Cinzel (600/700) for titles, deck/card names and big numbers; Manrope (400–700) for UI.
 */
export const typography = {
  display: { fontFamily: 'Cinzel_700Bold', fontSize: 28, lineHeight: 36 },
  title: { fontFamily: 'Cinzel_600SemiBold', fontSize: 21, lineHeight: 28 },
  heading: { fontFamily: 'Cinzel_600SemiBold', fontSize: 16, lineHeight: 22 },
  number: { fontFamily: 'Cinzel_700Bold', fontSize: 24, lineHeight: 30 },
  body: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 22 },
  label: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 16 },
  eyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TypeStyle>;

export type TypographyVariant = keyof typeof typography;
