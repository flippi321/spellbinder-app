import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useCardStore } from '@/stores/useCardStore';
import { colors, radii, spacing, typography } from '@/theme';
import type { Card } from '@/types';
import { messageOf } from '@/utils/errors';

interface CardSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  hint?: string;
  /** Called with the chosen card; the sheet closes when it resolves. */
  onSelect: (card: Card) => void | Promise<void>;
  /** Return an error message to reject a card (e.g. "can't be your commander"). */
  validate?: (card: Card) => string | null;
}

/** Name search backed by Scryfall autocomplete (rate-limited + cached), with an offline fallback. */
export function CardSearchSheet({ visible, onClose, title, hint, onSelect, validate }: CardSearchSheetProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ query: string; names: string[] }>({ query: '', names: [] });
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const names = await useCardStore.getState().autocomplete(trimmed);
        if (!cancelled) setResults({ query: trimmed, names });
      } catch (e) {
        if (!cancelled) setError(messageOf(e));
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [trimmed]);

  const names = trimmed.length >= 2 ? results.names : [];
  const searching = trimmed.length >= 2 && results.query !== trimmed;

  const close = () => {
    setQuery('');
    setError(null);
    setPicking(null);
    onClose();
  };

  const pick = async (name: string) => {
    setPicking(name);
    setError(null);
    try {
      const card = await useCardStore.getState().findByName(name);
      if (!card) {
        setError(`Couldn’t find ${name}.`);
        return;
      }
      const problem = validate?.(card) ?? null;
      if (problem) {
        setError(problem);
        return;
      }
      await onSelect(card);
      close();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setPicking(null);
    }
  };

  return (
    <Sheet visible={visible} onClose={close} title={title} tall>
      {hint ? (
        <Text variant="caption" tone="muted" style={styles.hint}>
          {hint}
        </Text>
      ) : null}
      <View style={styles.inputRow}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Card name"
          placeholderTextColor={colors.textMuted}
          autoFocus
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          style={styles.input}
          accessibilityLabel="Card name"
        />
        {searching ? <ActivityIndicator color={colors.gold} /> : null}
      </View>
      {error ? (
        <Text variant="label" tone="missing" style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <FlatList
        data={names}
        keyExtractor={(name) => name}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        ListEmptyComponent={
          <Text variant="caption" tone="muted" style={styles.empty}>
            {trimmed.length < 2 ? 'Type at least two letters.' : searching ? 'Searching…' : 'No matches.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void pick(item)}
            disabled={picking !== null}
            accessibilityRole="button"
            accessibilityLabel={item}
            style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
            <Text variant="body" style={styles.resultName} numberOfLines={1}>
              {item}
            </Text>
            {picking === item ? (
              <ActivityIndicator color={colors.gold} />
            ) : (
              <Icon name="plus" size={18} color={colors.gold} />
            )}
          </Pressable>
        )}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    paddingVertical: spacing.sm,
  },
  error: {
    marginTop: spacing.sm,
  },
  list: {
    marginTop: spacing.sm,
  },
  empty: {
    paddingVertical: spacing.lg,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultName: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
