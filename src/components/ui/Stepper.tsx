import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  /** What is being counted, used in accessibility labels ("copies in binder"). */
  label: string;
  min?: number;
  max?: number;
  style?: StyleProp<ViewStyle>;
}

/** − count + control. */
export function Stepper({ value, onChange, label, min = 0, max = 99, style }: StepperProps) {
  return (
    <View style={[styles.row, style]}>
      <IconButton
        icon="minus"
        variant="surface"
        accessibilityLabel={`Decrease ${label}`}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
      />
      <View style={styles.value} accessible accessibilityLabel={`${label}: ${value}`} accessibilityLiveRegion="polite">
        <Text variant="number" align="center">
          {value}
        </Text>
      </View>
      <IconButton
        icon="plus"
        variant="surface"
        accessibilityLabel={`Increase ${label}`}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    alignSelf: 'flex-start',
  },
  value: {
    minWidth: 36,
    alignItems: 'center',
  },
});
