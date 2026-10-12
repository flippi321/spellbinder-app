import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DeckTile } from '@/components/decks/DeckTile';
import { GameNightStrip } from '@/components/home/GameNightStrip';
import { GlanceTile } from '@/components/home/GlanceTile';
import { HomeHeader } from '@/components/home/HomeHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { ORACLE_TEASERS } from '@/services/oracleAnswers';
import { useBinderTotals, useDeckSummaries, useFriendFitCount } from '@/stores/hooks';
import { useDeckStore } from '@/stores/useDeckStore';
import { layout, spacing } from '@/theme';
import { formatCount } from '@/utils/format';

export default function HomeScreen() {
  const decks = useDeckStore((s) => s.decks);
  const summaries = useDeckSummaries();
  const totals = useBinderTotals();
  const friendFit = useFriendFitCount();
  const featured = decks.slice(0, 4);

  return (
    <Screen withTabBar>
      <HomeHeader />
      <GameNightStrip />

      <SectionHeader title="At a glance" style={styles.section} />
      <View style={styles.grid}>
        <View style={styles.row}>
          <GlanceTile
            value={formatCount(totals.cards)}
            label="cards in your binder"
            icon="binder"
            onPress={() => router.navigate('/binder')}
          />
          <GlanceTile
            value={String(friendFit)}
            label={friendFit === 1 ? 'card friends own fits your decks' : 'cards friends own fit your decks'}
            icon="group"
            onPress={() => router.navigate({ pathname: '/group', params: { segment: 'who' } })}
          />
        </View>
        <View style={styles.row}>
          <GlanceTile
            value={ORACLE_TEASERS.combo.value}
            label={ORACLE_TEASERS.combo.label}
            icon="sparkle"
            onPress={() => router.push({ pathname: '/oracle', params: { ask: ORACLE_TEASERS.combo.ask } })}
            accessibilityHint="Asks the Oracle"
          />
          <GlanceTile
            variant="oracle"
            eyebrow="Oracle tip"
            label={ORACLE_TEASERS.commander.label}
            icon="sparkle"
            onPress={() => router.push({ pathname: '/oracle', params: { ask: ORACLE_TEASERS.commander.ask } })}
            accessibilityHint="Asks the Oracle"
          />
        </View>
      </View>

      <SectionHeader
        title="Your decks"
        actionLabel="See all"
        onAction={() => router.navigate('/decks')}
        style={styles.section}
      />
      {featured.length === 0 ? (
        <Text variant="body" tone="muted">
          No decks yet.
        </Text>
      ) : (
        <View style={styles.grid}>
          {[0, 2].map((start) =>
            featured.length > start ? (
              <View key={start} style={styles.row}>
                {featured.slice(start, start + 2).map((deck) => (
                  <DeckTile key={deck.id} deck={deck} summary={summaries.get(deck.id)} />
                ))}
                {featured.length === start + 1 ? <View style={styles.spacer} /> : null}
              </View>
            ) : null,
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: layout.sectionGap + spacing.xs,
  },
  grid: {
    gap: layout.gridGap,
  },
  row: {
    flexDirection: 'row',
    gap: layout.gridGap,
  },
  spacer: {
    flex: 1,
  },
});
