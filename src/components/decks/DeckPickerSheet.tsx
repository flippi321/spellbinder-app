import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { ManaPips } from '@/components/ui/ManaPips';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useCardLookup } from '@/stores/hooks';
import { useDeckStore } from '@/stores/useDeckStore';
import { colors, spacing } from '@/theme';

export type PickerValue = 'binder' | { deckId: string };

interface DeckPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  onSelect: (value: PickerValue) => void;
  /** Offer "Binder" as the first option (scanner destination). */
  includeBinder?: boolean;
  /** Highlights the current choice. */
  selected?: PickerValue;
  /** Decks that already contain the card get an "In deck" note. */
  containsOracleId?: string;
}

const isSelected = (value: PickerValue, selected: PickerValue | undefined) =>
  selected !== undefined &&
  (value === 'binder' ? selected === 'binder' : selected !== 'binder' && selected.deckId === value.deckId);

/** Pick your binder or one of your decks. */
export function DeckPickerSheet({
  visible,
  onClose,
  title,
  onSelect,
  includeBinder = false,
  selected,
  containsOracleId,
}: DeckPickerSheetProps) {
  const decks = useDeckStore((s) => s.decks);
  const cardOf = useCardLookup();

  const row = (key: string, value: PickerValue, label: string, identity: readonly string[] | null, note?: string) => {
    const on = isSelected(value, selected);
    return (
      <Pressable
        key={key}
        onPress={() => {
          onSelect(value);
          onClose();
        }}
        accessibilityRole="button"
        accessibilityLabel={[label, note].filter(Boolean).join(', ')}
        accessibilityState={{ selected: on }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        {identity ? (
          <ManaPips colors={identity} size={16} />
        ) : (
          <Icon name="binder" size={20} color={colors.gold} />
        )}
        <Text variant="bodyStrong" style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {note ? (
          <Text variant="caption" tone="muted">
            {note}
          </Text>
        ) : null}
        {on ? <Icon name="check" size={18} color={colors.gold} strokeWidth={2.2} /> : null}
      </Pressable>
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.list}>
        {includeBinder ? row('binder', 'binder', 'Binder', null) : null}
        {decks.map((deck) =>
          row(
            deck.id,
            { deckId: deck.id },
            deck.name,
            cardOf(deck.commanderOracleId)?.color_identity ?? [],
            containsOracleId && deck.cards.some((c) => c.oracleId === containsOracleId) ? 'In deck' : undefined,
          ),
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
