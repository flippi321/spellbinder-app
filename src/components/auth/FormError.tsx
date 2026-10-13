import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';

/** Why the last request failed ("That email and password don't match."). Renders nothing without a message. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.banner} accessible accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Text variant="label" tone="missing">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xxs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.missingBorder,
    backgroundColor: colors.goldSoftBg,
  },
});
