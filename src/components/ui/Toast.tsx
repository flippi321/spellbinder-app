import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { colors, radii, shadows, spacing } from '@/theme';
import type { ToastMessage } from '@/types';

import { Icon } from './Icon';
import { Text } from './Text';

interface ToastProps {
  toast: ToastMessage | null;
  onHide: () => void;
  /** Distance from the bottom of the screen. */
  bottom: number;
  durationMs?: number;
}

/** Green confirmation toast ("Added 1× Sol Ring"). Re-shows whenever `toast.id` changes. */
export function Toast({ toast, onHide, bottom, durationMs = 2200 }: ToastProps) {
  const [progress] = useState(() => new Animated.Value(0));
  const id = toast?.id;

  useEffect(() => {
    if (id === undefined) return;
    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(durationMs),
      Animated.timing(progress, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished) onHide();
    });
    return () => animation.stop();
  }, [id, durationMs, onHide, progress]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.toast,
        {
          bottom,
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}>
      <Icon name="check" size={18} color={colors.successText} strokeWidth={2.2} />
      <Text variant="bodyStrong" tone="success" numberOfLines={1}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.chip,
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBg,
    boxShadow: shadows.raised,
  },
});
