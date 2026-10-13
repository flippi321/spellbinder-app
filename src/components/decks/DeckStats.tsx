import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text, type TextTone } from '@/components/ui/Text';
import type { DeckSummary } from '@/stores/selectors/ownership';
import { spacing } from '@/theme';
import type { Card as MtgCard, Deck } from '@/types';
import type { PrimaryType } from '@/utils/cards';
import { averageManaValue, manaCurve, typeBreakdown } from '@/utils/deckStats';

import { ManaCurveChart } from './ManaCurveChart';

const TYPE_LABELS: Record<PrimaryType, string> = {
  Creature: 'Creatures',
  Planeswalker: 'Planeswalkers',
  Battle: 'Battles',
  Instant: 'Instants',
  Sorcery: 'Sorceries',
  Artifact: 'Artifacts',
  Enchantment: 'Enchantments',
  Land: 'Lands',
  Other: 'Other',
};

interface DeckStatsProps {
  deck: Deck;
  summary: DeckSummary | undefined;
  cardOf: (cardId: string) => MtgCard | undefined;
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: TextTone }) {
  return (
    <Card padding={spacing.md} style={styles.stat} accessibilityLabel={`${label}: ${value}`}>
      <Text variant="number" tone={tone}>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </Card>
  );
}

/** Deck detail → Stats: mana curve, ownership counts, card types. */
export function DeckStats({ deck, summary, cardOf }: DeckStatsProps) {
  const types = typeBreakdown(deck, cardOf);
  return (
    <View style={styles.stack}>
      <Card>
        <Text variant="eyebrow" style={styles.eyebrow}>
          Mana curve
        </Text>
        <ManaCurveChart buckets={manaCurve(deck, cardOf)} average={averageManaValue(deck, cardOf)} />
      </Card>

      <View style={styles.row}>
        <StatTile label="Owned" value={summary?.owned ?? 0} tone="gold" />
        <StatTile label="In group" value={summary?.inGroup ?? 0} tone="friend" />
        <StatTile label="Missing" value={summary?.missing ?? 0} tone="missing" />
      </View>

      <Card>
        <Text variant="eyebrow" style={styles.eyebrow}>
          Card types
        </Text>
        {types.map(({ type, count }) => (
          <View key={type} style={styles.typeRow}>
            <Text variant="body" tone="secondary">
              {TYPE_LABELS[type]}
            </Text>
            <Text variant="bodyStrong">{count}</Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  eyebrow: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
  },
});
