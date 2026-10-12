import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

import { Icon } from './Icon';
import { Text, type TextTone } from './Text';

export type PillVariant = 'owned' | 'friend' | 'missing' | 'success' | 'neutral';

export interface PillProps {
  variant: PillVariant;
  /** Optional for `owned`, which renders as a gold check. */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

const variants: Record<PillVariant, { bg: string; border: string; text: TextTone }> = {
  owned: { bg: colors.transparent, border: colors.transparent, text: 'gold' },
  friend: { bg: colors.friendBg, border: colors.friendBg, text: 'friend' },
  missing: { bg: colors.transparent, border: colors.missingBorder, text: 'missing' },
  success: { bg: colors.successBg, border: colors.successBg, text: 'success' },
  neutral: { bg: colors.surfaceRaised, border: colors.border, text: 'secondary' },
};

/** Ownership/status pill: gold check (owned), "Jonas has it" (friend), "Missing", "Going". */
export function Pill({ variant, label, style }: PillProps) {
  const v = variants[variant];
  if (variant === 'owned' && !label) {
    return (
      <View style={[styles.check, style]} accessible accessibilityLabel="Owned">
        <Icon name="check" size={18} color={colors.gold} strokeWidth={2.2} />
      </View>
    );
  }
  return (
    <View
      style={[styles.pill, { backgroundColor: v.bg, borderColor: v.border }, style]}
      accessible
      accessibilityLabel={label}>
      {variant === 'owned' ? <Icon name="check" size={13} color={colors.gold} strokeWidth={2.2} /> : null}
      <Text variant="caption" tone={v.text} numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 24,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.chip,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: typography.label.fontFamily,
  },
  check: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
