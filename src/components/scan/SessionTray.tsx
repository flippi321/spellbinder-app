import { ScrollView, StyleSheet, View } from 'react-native';

import { CardImage } from '@/components/ui/CardImage';
import { Text } from '@/components/ui/Text';
import type { ScanSessionEntry } from '@/stores/useScanStore';
import { colors, radii, spacing } from '@/theme';

/** "3 scanned" + mini thumbnails of this session's cards. */
export function SessionTray({ session }: { session: readonly ScanSessionEntry[] }) {
  const count = session.reduce((sum, entry) => sum + entry.quantity, 0);
  return (
    <View
      style={styles.tray}
      accessible
      accessibilityLabel={
        count === 0 ? 'Nothing scanned yet' : `${count} scanned: ${session.map((e) => e.card.name).join(', ')}`
      }>
      <Text variant="label" tone={count > 0 ? 'goldSoft' : 'muted'}>
        {count} scanned
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
        {session.map((entry) => (
          <View key={entry.key} style={[styles.thumb, entry.foil && styles.foil]}>
            <CardImage card={entry.card} size="small" radius={radii.sm / 2} showPlaceholderLabel={false} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
  },
  thumbs: {
    gap: spacing.xs + 2,
    alignItems: 'center',
  },
  thumb: {
    width: 30,
    borderRadius: radii.sm / 2,
    borderWidth: 1,
    borderColor: colors.transparent,
  },
  foil: {
    borderColor: colors.gold,
  },
});
