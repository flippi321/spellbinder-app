import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DeckListItem } from '@/components/decks/DeckListItem';
import { OracleButton } from '@/components/navigation/OracleButton';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { CardSearchSheet } from '@/components/search/CardSearchSheet';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { useDeckSummaries } from '@/stores/hooks';
import { useDeckStore } from '@/stores/useDeckStore';
import { layout, spacing } from '@/theme';
import { canBeCommander } from '@/utils/cards';
import { plural } from '@/utils/format';

type DeckFilter = 'all' | 'need' | 'complete';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'need', label: 'Need cards' },
  { value: 'complete', label: 'Complete' },
] as const;

export default function DecksScreen() {
  const decks = useDeckStore((s) => s.decks);
  const loading = useDeckStore((s) => s.loading);
  const summaries = useDeckSummaries();
  const [filter, setFilter] = useState<DeckFilter>('all');
  const [creating, setCreating] = useState(false);

  const visible = decks.filter((deck) => {
    const complete = summaries.get(deck.id)?.complete ?? false;
    if (filter === 'need') return !complete;
    if (filter === 'complete') return complete;
    return true;
  });

  return (
    <>
      <Screen withTabBar>
        <ScreenHeader
          title="Decks"
          subtitle={loading && decks.length === 0 ? 'Loading…' : plural(decks.length, 'deck')}
          actions={
            <>
              <OracleButton />
              <IconButton icon="plus" variant="gold" accessibilityLabel="New deck" onPress={() => setCreating(true)} />
            </>
          }
        />
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} accessibilityLabel="Filter decks" />
        <View style={styles.list}>
          {visible.map((deck) => (
            <DeckListItem key={deck.id} deck={deck} summary={summaries.get(deck.id)} />
          ))}
          {visible.length === 0 && !loading ? (
            <Text variant="body" tone="muted" align="center" style={styles.empty}>
              {filter === 'complete' ? 'No complete decks yet.' : filter === 'need' ? 'Every deck is complete.' : 'No decks yet — tap + to start one.'}
            </Text>
          ) : null}
        </View>
      </Screen>

      <CardSearchSheet
        visible={creating}
        onClose={() => setCreating(false)}
        title="New deck"
        hint="Search for the legendary creature that will lead it."
        validate={(card) => (canBeCommander(card) ? null : `${card.name} can’t be your commander.`)}
        onSelect={async (card) => {
          const deck = await useDeckStore.getState().createDeck(card);
          router.push({ pathname: '/deck/[id]', params: { id: deck.id } });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: spacing.lg,
    gap: layout.gridGap + spacing.xs,
  },
  empty: {
    marginTop: spacing.xxl,
  },
});
