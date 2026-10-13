import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CardImage } from '@/components/ui/CardImage';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import type { BinderEntry } from '@/stores/selectors/binder';
import { colors, radii, spacing } from '@/theme';
import type { Card } from '@/types';

interface CardTileProps {
  entry: BinderEntry;
  card: Card | undefined;
  onPress: (entry: BinderEntry) => void;
}

/**
 * Binder grid tile: 63:88 image, "×3 · 1 foil", then a "Spare" chip (in no deck), an "N spare" chip (copies beyond
 * what your decks use) or "In 2 decks". Foils get a gold border.
 */
export const CardTile = memo(function CardTile({ entry, card, onPress }: CardTileProps) {
  const foil = entry.foilQuantity > 0;
  const spare = entry.spare > 0;
  const counts = `×${entry.quantity}${foil ? ` · ${entry.foilQuantity === entry.quantity ? 'foil' : `${entry.foilQuantity} foil`}` : ''}`;
  const inDecks = `In ${entry.deckIds.length} ${entry.deckIds.length === 1 ? 'deck' : 'decks'}`;
  const decks = !spare ? inDecks : entry.deckIds.length === 0 ? 'Spare' : `${entry.spare} spare`;

  return (
    <Pressable
      onPress={() => onPress(entry)}
      accessibilityRole="button"
      accessibilityLabel={`${card?.name ?? 'Card'}, ${counts.replace('×', '')} copies, ${spare && entry.deckIds.length > 0 ? `${decks}, ${inDecks.toLowerCase()}` : decks}`}
      style={({ pressed }) => [styles.tile, foil && styles.foil, pressed && styles.pressed]}>
      <CardImage card={card} size="normal" radius={radii.sm} />
      <View style={styles.meta}>
        <Text variant="label" tone={foil ? 'goldSoft' : 'secondary'}>
          {counts}
        </Text>
        {spare ? (
          <Chip label={decks} tone="friend" size="sm" />
        ) : (
          <Text variant="caption" tone="muted">
            {decks}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    padding: spacing.sm,
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  foil: {
    borderColor: colors.gold,
    backgroundColor: colors.surfaceGold,
  },
  pressed: {
    opacity: 0.85,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    minHeight: 26,
  },
});
