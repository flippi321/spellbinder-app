import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout } from '@/theme';

import { Icon, type IconName, type IconProps } from './Icon';

export type IconButtonVariant = 'surface' | 'gold' | 'oracle' | 'ghost' | 'scrim' | 'active';

export interface IconButtonProps {
  icon: IconName;
  /** Required: icon-only buttons must be labelled for screen readers. */
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress?: () => void;
  variant?: IconButtonVariant;
  /** Visual diameter; never below the 44-pt touch target. */
  size?: number;
  iconSize?: number;
  direction?: IconProps['direction'];
  filled?: boolean;
  disabled?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

const palette: Record<IconButtonVariant, { bg: string; border: string; icon: string }> = {
  surface: { bg: colors.surfaceRaised, border: colors.border, icon: colors.text },
  gold: { bg: colors.gold, border: colors.gold, icon: colors.goldInk },
  oracle: { bg: colors.goldSoftBg, border: colors.borderGold, icon: colors.gold },
  ghost: { bg: colors.transparent, border: colors.transparent, icon: colors.text },
  scrim: { bg: colors.scrim, border: colors.transparent, icon: colors.text },
  active: { bg: colors.goldSoftBg, border: colors.borderGold, icon: colors.goldSoftText },
};

/** Round, 44-pt icon button with a mandatory accessibility label. */
export function IconButton({
  icon,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  variant = 'surface',
  size = layout.minTouch,
  iconSize = 20,
  direction,
  filled,
  disabled = false,
  selected,
  style,
}: IconButtonProps) {
  const p = palette[variant];
  const visual = Math.max(size, 32);
  const slop = Math.max(0, (layout.minTouch - visual) / 2);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={slop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      style={({ pressed }) => [
        styles.base,
        {
          width: visual,
          height: visual,
          borderRadius: visual / 2,
          backgroundColor: p.bg,
          borderColor: p.border,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}>
      <Icon name={icon} size={iconSize} color={p.icon} direction={direction} filled={filled} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
