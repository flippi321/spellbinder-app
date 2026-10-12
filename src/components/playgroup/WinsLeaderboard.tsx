import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import type { LeaderboardRow } from '@/stores/selectors/playgroup';
import { colors, spacing } from '@/theme';

const BAR = 10; // thin mark (≤ 24 px)

/**
 * Single-series horizontal bars (one color, so no legend): wins per member, value at
 * the tip in a text color. The accessibility label carries every row.
 */
export function WinsLeaderboard({ rows, games }: { rows: readonly LeaderboardRow[]; games: number }) {
  const max = Math.max(1, ...rows.map((row) => row.wins));
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Wins this season, ${games} games: ${rows
        .map((row) => `${row.profile.displayName} ${row.wins}`)
        .join(', ')}`}
      style={styles.list}>
      {rows.map((row) => (
        <View key={row.profile.id} style={styles.row}>
          <Avatar profile={row.profile} size={28} />
          <Text variant="label" tone="secondary" style={styles.name} numberOfLines={1}>
            {row.profile.displayName}
          </Text>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${(row.wins / max) * 100}%` }]} />
            <Text variant="label" style={styles.value}>
              {row.wins}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    width: 56,
  },
  track: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  bar: {
    height: BAR,
    minWidth: 4,
    backgroundColor: colors.gold,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  value: {
    minWidth: 18,
  },
});
