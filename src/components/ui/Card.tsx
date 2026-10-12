import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme';

export type CardVariant = 'default' | 'raised' | 'gold' | 'oracle';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const variants: Record<CardVariant, { bg: string; border: string }> = {
  default: { bg: colors.surface, border: colors.border },
  raised: { bg: colors.surfaceRaised, border: colors.borderStrong },
  gold: { bg: colors.surfaceGold, border: colors.borderGold },
  oracle: { bg: colors.surfaceOracle, border: colors.borderGold },
};

/** Surface panel (not a Magic card — see CardImage for those). */
export function Card({
  children,
  variant = 'default',
  padding = spacing.lg,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: CardProps) {
  const v = variants[variant];
  const panel = [styles.base, { backgroundColor: v.bg, borderColor: v.border, padding }, style];

  if (!onPress) return <View style={panel}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [panel, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
