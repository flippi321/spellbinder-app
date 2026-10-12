import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radii, spacing } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const palette = {
  primary: { bg: colors.gold, border: colors.gold, text: 'ink' as const, icon: colors.goldInk },
  secondary: { bg: colors.transparent, border: colors.borderStrong, text: 'primary' as const, icon: colors.text },
  ghost: { bg: colors.transparent, border: colors.transparent, text: 'gold' as const, icon: colors.gold },
};

/** Primary (gold), secondary (outline) and ghost buttons. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ButtonProps) {
  const p = palette[variant];
  const height = size === 'md' ? 48 : 36;
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      hitSlop={size === 'sm' ? (layout.minTouch - height) / 2 : undefined}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          paddingHorizontal: size === 'md' ? spacing.xl : spacing.lg,
          borderRadius: size === 'md' ? radii.lg : radii.md,
          backgroundColor: p.bg,
          borderColor: p.border,
          opacity: inactive ? 0.5 : pressed ? 0.82 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.icon} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={size === 'md' ? 20 : 17} color={p.icon} /> : null}
          <Text variant={size === 'md' ? 'bodyStrong' : 'label'} tone={p.text} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
    flexGrow: 1,
  },
});
