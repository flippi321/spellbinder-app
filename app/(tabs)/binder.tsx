import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardTile } from '@/components/binder/CardTile';
import { ColorFilter } from '@/components/binder/ColorFilter';
import { OracleButton } from '@/components/navigation/OracleButton';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { useTabBarInset } from '@/components/navigation/useTabBarInset';
import { CardSearchSheet } from '@/components/search/CardSearchSheet';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useBinderEntries, useBinderTotals } from '@/stores/hooks';
import { filterBinder, type BinderEntry, type BinderTypeFilter } from '@/stores/selectors/binder';
import { useCardStore } from '@/stores/useCardStore';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { colors, layout, radii, spacing, typography, type ManaColor } from '@/theme';
import { formatCount } from '@/utils/format';

const TYPE_CHIPS: { value: BinderTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'spare', label: 'Spare' },
  { value: 'foils', label: 'Foils' },
  { value: 'creatures', label: 'Creatures' },
  { value: 'instants', label: 'Instants' },
  { value: 'artifacts', label: 'Artifacts' },
  { value: 'lands', label: 'Lands' },
];

export default function BinderScreen() {
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const entries = useBinderEntries();
  const totals = useBinderTotals();
  const cards = useCardStore((s) => s.cards);
  const loading = useCollectionStore((s) => s.loading);
  const [query, setQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<ManaColor[]>([]);
  const [type, setType] = useState<BinderTypeFilter>('all');
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(
    () => filterBinder(entries, { query, colors: colorFilter, type }, (entry) => cards[entry.scryfallId]),
    [entries, query, colorFilter, type, cards],
  );

  const openCard = useCallback(
    (entry: BinderEntry) => router.push({ pathname: '/card/[id]', params: { id: entry.scryfallId } }),
    [],
  );

  const header = (
    <View style={styles.header}>
      <ScreenHeader
        title="Binder"
        subtitle={
          loading && entries.length === 0
            ? 'Loading…'
            : `${formatCount(totals.cards)} cards · ${formatCount(totals.spare)} spare · ${formatCount(totals.foils)} foils`
        }
        actions={
          <>
            <OracleButton />
            <IconButton icon="import" accessibilityLabel="Add cards" onPress={() => setAdding(true)} />
          </>
        }
      />
      <View style={styles.search}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your binder"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={styles.input}
          accessibilityLabel="Search your binder"
        />
      </View>
      <ColorFilter selected={colorFilter} onChange={setColorFilter} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {TYPE_CHIPS.map((chip) => (
          <Chip key={chip.value} label={chip.label} selected={type === chip.value} onPress={() => setType(chip.value)} />
        ))}
      </ScrollView>
      <Text variant="caption" tone="muted">
        Showing {formatCount(filtered.length)} of {formatCount(entries.length)}
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={filtered}
        keyExtractor={(entry) => entry.oracleId}
        numColumns={2}
        ListHeaderComponent={header}
        renderItem={({ item }) => <CardTile entry={item} card={cards[item.scryfallId]} onPress={openCard} />}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm, paddingBottom: tabBarInset }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={8}
        windowSize={7}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text variant="body" tone="muted" align="center" style={styles.empty}>
            {loading ? 'Loading your binder…' : 'No cards match these filters.'}
          </Text>
        }
      />
      <CardSearchSheet
        visible={adding}
        onClose={() => setAdding(false)}
        title="Add to binder"
        hint="Adds one non-foil copy. CSV and text-list import are coming later."
        onSelect={(card) => useCollectionStore.getState().addCard(card)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    gap: layout.gridGap,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    paddingVertical: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  column: {
    gap: layout.gridGap,
  },
  empty: {
    marginTop: spacing.xxl,
  },
});
