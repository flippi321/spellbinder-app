import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme';

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'muted'
  | 'gold'
  | 'goldSoft'
  | 'ink'
  | 'friend'
  | 'missing'
  | 'success';

const toneColor: Record<TextTone, string> = {
  primary: colors.text,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  muted: colors.textMuted,
  gold: colors.gold,
  goldSoft: colors.goldSoftText,
  ink: colors.goldInk,
  friend: colors.friendText,
  missing: colors.missingText,
  success: colors.successText,
};

const defaultTone: Partial<Record<TypographyVariant, TextTone>> = {
  caption: 'muted',
  eyebrow: 'muted',
};

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: 'left' | 'center' | 'right';
}

/** All app text. Variants map to Cinzel/Manrope styles from the theme. */
export function Text({ variant = 'body', tone, align, style, ...rest }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[
        typography[variant],
        { color: toneColor[tone ?? defaultTone[variant] ?? 'primary'] },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
