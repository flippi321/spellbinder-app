import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ManaCost } from '@/components/ui/ManaCost';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';
import type { Card, DeckCard, OwnershipStatus, Profile } from '@/types';

interface DeckSlotRowProps {
  slot: DeckCard;
  card: Card | undefined;
  status: OwnershipStatus;
  membersById: ReadonlyMap<string, Profile>;
}

function friendLabel(ownerIds: readonly string[], membersById: ReadonlyMap<string, Profile>): string {
  const first = membersById.get(ownerIds[0])?.displayName ?? 'A friend';
  return ownerIds.length > 1 ? `${first} +${ownerIds.length - 1} have it` : `${first} has it`;
}

/** One card in a deck category: name, cost, and owned (gold check) / friend / missing. */
export function DeckSlotRow({ slot, card, status, membersById }: DeckSlotRowProps) {
  const name = card?.name ?? 'Loading…';
  const statusLabel =
    status.kind === 'owned' ? 'Owned' : status.kind === 'friend' ? friendLabel(status.ownerIds, membersById) : 'Missing';

  return (
    <Pressable
      onPress={card ? () => router.push({ pathname: '/card/[id]', params: { id: card.id } }) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${slot.quantity > 1 ? `${slot.quantity} ` : ''}${name}, ${statusLabel}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.name}>
        {slot.quantity > 1 ? (
          <Text variant="label" tone="muted">
            {slot.quantity}
          </Text>
        ) : null}
        <Text variant="body" numberOfLines={1} style={styles.flex}>
          {name}
        </Text>
      </View>
      <ManaCost cost={card?.mana_cost} size={14} />
      <View style={styles.status}>
        {status.kind === 'owned' ? (
          <Pill variant="owned" />
        ) : status.kind === 'friend' ? (
          <Pill variant="friend" label={statusLabel} />
        ) : (
          <Pill variant="missing" label="Missing" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  name: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  status: {
    minWidth: 24,
    alignItems: 'flex-end',
  },
});
