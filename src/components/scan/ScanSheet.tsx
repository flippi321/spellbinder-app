import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { CardImage } from '@/components/ui/CardImage';
import { Stepper } from '@/components/ui/Stepper';
import { Text } from '@/components/ui/Text';
import type { ScanMatch, ScanStatus } from '@/stores/useScanStore';
import { colors, radii, shadows, spacing } from '@/theme';
import { percent } from '@/utils/format';

interface ScanSheetProps {
  status: ScanStatus;
  match: ScanMatch | null;
  error: string | null;
  foil: boolean;
  quantity: number;
  /** "binder" or the deck's short name. */
  destinationLabel: string;
  toBinder: boolean;
  owned: number;
  deckCount: number;
  onToggleFoil: () => void;
  onQuantity: (quantity: number) => void;
  onChangePrinting: () => void;
  onRescan: () => void;
  onTypeIt: () => void;
  onAdd: () => void;
}

/** Slides up after a capture: the match, foil/quantity, then "Add 1 to binder". */
export function ScanSheet(props: ScanSheetProps) {
  const { status, match, error, foil, quantity, destinationLabel, toBinder, owned, deckCount } = props;
  const insets = useSafeAreaInsets();
  const visible = status === 'matched' || status === 'error';
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(slide, { toValue: visible ? 1 : 0, useNativeDriver: true, bounciness: 2, speed: 14 }).start();
  }, [visible, slide]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityViewIsModal={visible}
      style={[
        styles.sheet,
        {
          paddingBottom: insets.bottom + spacing.lg,
          opacity: slide,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }],
        },
      ]}>
      <View style={styles.handle} />
      {status === 'error' || !match ? (
        <View style={styles.block}>
          <Text variant="eyebrow" tone="missing">
            No match
          </Text>
          <Text variant="body" accessibilityLiveRegion="polite">
            {error ?? 'Couldn’t read that card.'}
          </Text>
          <View style={styles.buttons}>
            <Button label="Type it" variant="secondary" fullWidth onPress={props.onTypeIt} />
            <Button label="Rescan" fullWidth onPress={props.onRescan} />
          </View>
        </View>
      ) : (
        <View style={styles.block}>
          <Text variant="eyebrow" tone="success" accessibilityLiveRegion="polite">
            Card found · {percent(match.confidence)} match
          </Text>
          <View style={styles.cardRow}>
            <CardImage card={match.card} size="small" style={styles.thumb} radius={radii.sm / 2} />
            <View style={styles.cardText}>
              <Text variant="title" numberOfLines={2}>
                {match.card.name}
              </Text>
              <Text variant="caption" tone="muted">
                {match.card.set.toUpperCase()} · #{match.card.collector_number}
              </Text>
              <Text variant="label" tone="secondary">
                You own {owned} · in {deckCount} {deckCount === 1 ? 'deck' : 'decks'}
              </Text>
            </View>
          </View>

          <View style={styles.optionRow}>
            <Text variant="bodyStrong" style={styles.flex}>
              Foil
            </Text>
            <Switch
              value={foil}
              onValueChange={props.onToggleFoil}
              trackColor={{ false: colors.borderStrong, true: colors.gold }}
              thumbColor={colors.text}
              ios_backgroundColor={colors.borderStrong}
              accessibilityLabel="Foil"
            />
          </View>
          <View style={styles.optionRow}>
            <Button label="Change printing" variant="ghost" size="sm" onPress={props.onChangePrinting} />
            <View style={styles.flex} />
            <Stepper value={quantity} min={1} max={99} label="copies to add" onChange={props.onQuantity} />
          </View>

          {error ? (
            <Text variant="label" tone="missing">
              {error}
            </Text>
          ) : null}

          <View style={styles.buttons}>
            <Button label="Rescan" variant="secondary" fullWidth onPress={props.onRescan} />
            <Button
              label={toBinder ? `Add ${quantity} to binder` : `Add to ${destinationLabel}`}
              icon="plus"
              fullWidth
              onPress={props.onAdd}
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    boxShadow: shadows.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  block: {
    gap: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  thumb: {
    width: 64,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  flex: {
    flex: 1,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});
