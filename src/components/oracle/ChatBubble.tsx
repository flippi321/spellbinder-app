import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';

/** Your message: right-aligned, dark gold. */
export function ChatBubble({ text }: { text: string }) {
  return (
    <View style={styles.bubble} accessible accessibilityLabel={`You asked: ${text}`}>
      <Text variant="body" tone="goldSoft">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
    borderBottomRightRadius: radii.sm / 2,
    backgroundColor: colors.goldSoftBg,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
});
