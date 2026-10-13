import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import type { DeckCategoryGroup } from '@/stores/selectors/ownership';
import { colors, radii, spacing } from '@/theme';
import type { Card, Profile } from '@/types';

import { DeckSlotRow } from './DeckSlotRow';

interface CategorySectionProps {
  group: DeckCategoryGroup;
  expanded: boolean;
  onToggle: () => void;
  cardOf: (cardId: string) => Card | undefined;
  membersById: ReadonlyMap<string, Profile>;
}

/** Accordion section for one deck category ("Ramp · 8"). */
export function CategorySection({ group, expanded, onToggle, cardOf, membersById }: CategorySectionProps) {
  const notOwned = group.rows.filter((row) => row.status.kind !== 'owned').length;
  return (
    <View style={styles.section}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${group.category}, ${group.count} cards${notOwned ? `, ${notOwned} not owned` : ''}`}
        accessibilityState={{ expanded }}
        style={styles.header}>
        <Text variant="heading" style={styles.title}>
          {group.category}
        </Text>
        {notOwned > 0 ? (
          <Text variant="caption" tone="missing">
            {notOwned} to get
          </Text>
        ) : null}
        <Text variant="label" tone="muted">
          {group.count}
        </Text>
        <Icon name="chevron" direction={expanded ? 'up' : 'down'} size={18} color={colors.textMuted} />
      </Pressable>
      {expanded ? (
        <View style={styles.rows}>
          {group.rows.map((row) => (
            <DeckSlotRow
              key={row.slot.cardId}
              slot={row.slot}
              card={cardOf(row.slot.cardId)}
              status={row.status}
              membersById={membersById}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
  },
  title: {
    flex: 1,
  },
  rows: {
    paddingBottom: spacing.sm,
  },
});
