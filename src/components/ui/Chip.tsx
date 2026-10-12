import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radii, spacing } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text, type TextTone } from './Text';

export type ChipTone = 'default' | 'gold' | 'friend' | 'success' | 'missing';

export interface ChipProps {
  label: string;
  /** Makes it a toggle (filters, suggestions). */
  onPress?: () => void;
  selected?: boolean;
  tone?: ChipTone;
  icon?: IconName;
  size?: 'sm' | 'md';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const tones: Record<ChipTone, { bg: string; border: string; text: TextTone; icon: string }> = {
  default: { bg: colors.surfaceRaised, border: colors.border, text: 'secondary', icon: colors.textSecondary },
  gold: { bg: colors.goldSoftBg, border: colors.borderGold, text: 'goldSoft', icon: colors.gold },
  friend: { bg: colors.friendBg, border: colors.friendBg, text: 'friend', icon: colors.friendText },
  success: { bg: colors.successBg, border: colors.successBg, text: 'success', icon: colors.successText },
  missing: { bg: colors.transparent, border: colors.missingBorder, text: 'missing', icon: colors.missingText },
};

/** Rounded label: static info ("Bracket 3") or a selectable filter/suggestion. */
export function Chip({
  label,
  onPress,
  selected = false,
  tone = 'default',
  icon,
  size = 'md',
  accessibilityLabel,
  style,
}: ChipProps) {
  const t = selected ? tones.gold : tones[tone];
  const height = size === 'md' ? 34 : 26;
  const body = (
    <View style={styles.row}>
      {icon ? <Icon name={icon} size={size === 'md' ? 15 : 13} color={t.icon} /> : null}
      <Text variant={size === 'md' ? 'label' : 'caption'} tone={t.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
  const chipStyle = [
    styles.base,
    {
      height,
      paddingHorizontal: size === 'md' ? spacing.md + 2 : spacing.sm + 2,
      backgroundColor: t.bg,
      borderColor: t.border,
    },
    style,
  ];

  if (!onPress) {
    return (
      <View style={chipStyle} accessible accessibilityLabel={accessibilityLabel ?? label}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={(layout.minTouch - height) / 2}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [chipStyle, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
