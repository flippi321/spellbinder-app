import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { CardImage } from '@/components/ui/CardImage';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useCardStore } from '@/stores/useCardStore';
import { colors, radii, spacing } from '@/theme';
import type { Card } from '@/types';
import { messageOf } from '@/utils/errors';

interface PrintingsSheetProps {
  visible: boolean;
  onClose: () => void;
  cardId: string;
  currentId: string;
  onPick: (card: Card) => void;
}

/** Every printing of a card (Scryfall `oracleid:` search, newest first). */
export function PrintingsSheet({ visible, onClose, cardId, currentId, onPick }: PrintingsSheetProps) {
  const [result, setResult] = useState<{ cardId: string; printings: Card[]; error: string | null } | null>(null);
  const loaded = result?.cardId === cardId ? result : null;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    useCardStore
      .getState()
      .getPrintings(cardId)
      .then((printings) => !cancelled && setResult({ cardId, printings, error: null }))
      .catch((error: unknown) => !cancelled && setResult({ cardId, printings: [], error: messageOf(error) }));
    return () => {
      cancelled = true;
    };
  }, [visible, cardId]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Other printings" tall>
      {!loaded ? (
        <ActivityIndicator color={colors.gold} style={styles.loading} />
      ) : (
        <FlatList
          data={loaded.printings}
          keyExtractor={(card) => card.id}
          ListEmptyComponent={
            <Text variant="body" tone="muted" style={styles.loading}>
              {loaded.error ?? 'No other printings found.'}
            </Text>
          }
          renderItem={({ item }) => {
            const current = item.id === currentId;
            return (
              <Pressable
                onPress={() => {
                  onPick(item);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={`${item.set_name ?? item.set}, number ${item.collector_number}`}
                accessibilityState={{ selected: current }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <CardImage card={item} size="small" style={styles.thumb} radius={radii.sm / 2} />
                <View style={styles.text}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {item.set_name ?? item.set.toUpperCase()}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {item.set.toUpperCase()} · #{item.collector_number}
                    {item.released_at ? ` · ${item.released_at.slice(0, 4)}` : ''}
                  </Text>
                </View>
                {current ? <Icon name="check" size={18} color={colors.gold} strokeWidth={2.2} /> : null}
              </Pressable>
            );
          }}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginVertical: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  thumb: {
    width: 44,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
