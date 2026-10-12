import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ManaPips } from '@/components/ui/ManaPips';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import type { DeckSummary } from '@/stores/selectors/ownership';
import { useCardByOracle } from '@/stores/useCardStore';
import { colors, radii, spacing } from '@/theme';
import type { Deck } from '@/types';
import { percent, shortDeckName } from '@/utils/format';

import { DeckBanner } from './DeckBanner';

interface DeckTileProps {
  deck: Deck;
  summary: DeckSummary | undefined;
}

/** Compact deck tile for the Home 2×2 grid. */
export function DeckTile({ deck, summary }: DeckTileProps) {
  const commander = useCardByOracle(deck.commanderOracleId);
  const complete = summary?.complete ?? false;
  const status = !summary ? ' ' : complete ? 'Complete' : `${summary.notOwned} missing`;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/deck/[id]', params: { id: deck.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${deck.name}, ${summary ? `${percent(summary.ownedRatio)} owned, ${status}` : ''}`}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <DeckBanner deck={deck} height={64}>
        <ManaPips colors={commander?.color_identity ?? []} size={16} style={styles.pips} />
      </DeckBanner>
      <View style={styles.body}>
        <Text variant="heading" numberOfLines={1}>
          {shortDeckName(deck.name)}
        </Text>
        <ProgressBar progress={summary?.ownedRatio ?? 0} tone={complete ? 'success' : 'gold'} height={4} />
        <Text variant="caption" tone={complete ? 'success' : 'muted'}>
          {status}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  pips: {
    position: 'absolute',
    left: spacing.sm + 2,
    bottom: spacing.sm,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
});
