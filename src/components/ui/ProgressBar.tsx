import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii } from '@/theme';

interface ProgressBarProps {
  /** 0–1 */
  progress: number;
  tone?: 'gold' | 'success' | 'friend';
  height?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const fills = { gold: colors.gold, success: colors.successText, friend: colors.friendText };

export function ProgressBar({ progress, tone = 'gold', height = 6, accessibilityLabel, style }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      <View
        style={{
          width: `${clamped * 100}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: fills[tone],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
    borderRadius: radii.chip,
  },
});
