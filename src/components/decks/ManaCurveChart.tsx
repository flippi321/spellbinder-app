import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';
import type { CurveBucket } from '@/utils/deckStats';

interface ManaCurveChartProps {
  buckets: readonly CurveBucket[];
  average: number;
}

const PLOT_HEIGHT = 120;
const BAR_WIDTH = 22; // thin marks: ≤ 24 px, never fill the slot

/**
 * Single-series column chart: one color (gold) for every bar, so no legend — the title
 * names it. Each column's count sits on its cap in a text color; tapping a column
 * highlights it and reads it out below. The accessibility label carries every value.
 */
export function ManaCurveChart({ buckets, average }: ManaCurveChartProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const active = selected !== null ? buckets[selected] : null;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Mana curve, ${total} nonland cards. ${buckets
        .map((b) => `Mana value ${b.label}: ${b.count}`)
        .join('. ')}. Average mana value ${average.toFixed(1)}.`}>
      <View style={styles.plot}>
        {buckets.map((bucket, index) => {
          const height = bucket.count === 0 ? 0 : Math.max(4, (bucket.count / max) * PLOT_HEIGHT);
          const isActive = selected === index;
          return (
            <Pressable
              key={bucket.label}
              onPress={() => setSelected(isActive ? null : index)}
              style={styles.slot}
              accessibilityElementsHidden>
              <Text variant="caption" tone={isActive ? 'primary' : 'secondary'} style={styles.cap}>
                {bucket.count > 0 ? bucket.count : ''}
              </Text>
              <View
                style={[
                  styles.bar,
                  { height, backgroundColor: isActive ? colors.goldSoftText : colors.gold },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.baseline} />
      <View style={styles.axis}>
        {buckets.map((bucket) => (
          <Text key={bucket.label} variant="caption" tone="muted" style={styles.tick}>
            {bucket.label}
          </Text>
        ))}
      </View>
      <Text variant="caption" tone="secondary" style={styles.readout}>
        {active
          ? `Mana value ${active.label} · ${active.count} ${active.count === 1 ? 'card' : 'cards'}`
          : `Average mana value ${average.toFixed(1)} · tap a bar for details`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: PLOT_HEIGHT + 20,
  },
  slot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cap: {
    marginBottom: spacing.xs,
  },
  bar: {
    width: BAR_WIDTH,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  baseline: {
    height: 1,
    backgroundColor: colors.border,
  },
  axis: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  tick: {
    flex: 1,
    textAlign: 'center',
  },
  readout: {
    marginTop: spacing.md,
  },
});
