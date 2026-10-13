import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { ManaPips } from '@/components/ui/ManaPips';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import type { DeckSummary } from '@/stores/selectors/ownership';
import { useCardByCardId } from '@/stores/useCardStore';
import { colors, radii, spacing } from '@/theme';
import type { Deck } from '@/types';
import { percent } from '@/utils/format';

import { DeckBanner } from './DeckBanner';

interface DeckListItemProps {
  deck: Deck;
  summary: DeckSummary | undefined;
}

/** Large deck card on the Decks tab: art banner, pips, bracket, name, theme, ownership. */
export function DeckListItem({ deck, summary }: DeckListItemProps) {
  const commander = useCardByCardId(deck.commanderCardId);
  const complete = summary?.complete ?? false;
  const ownership = summary
    ? complete
      ? `${percent(1)} owned · Complete`
      : `${percent(summary.ownedRatio)} owned · ${summary.notOwned} missing`
    : '';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/deck/[id]', params: { id: deck.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${deck.name}. Bracket ${deck.bracket}. ${ownership}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <DeckBanner deck={deck} height={128} showArt>
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.pipsChip}>
            <ManaPips colors={commander?.color_identity ?? []} size={18} />
          </View>
          <Chip label={`Bracket ${deck.bracket}`} size="sm" style={styles.bracket} />
        </View>
      </DeckBanner>
      <View style={styles.body}>
        <Text variant="title" numberOfLines={1}>
          {deck.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {deck.theme}
        </Text>
        <ProgressBar progress={summary?.ownedRatio ?? 0} tone={complete ? 'success' : 'gold'} style={styles.progress} />
        <Text variant="label" tone={complete ? 'success' : 'secondary'}>
          {ownership}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
  },
  pipsChip: {
    backgroundColor: colors.scrim,
    borderRadius: radii.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bracket: {
    backgroundColor: colors.scrim,
    borderColor: colors.transparent,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  progress: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});
