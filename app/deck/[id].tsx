import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategorySection } from '@/components/decks/CategorySection';
import { DeckBanner } from '@/components/decks/DeckBanner';
import { DeckStats } from '@/components/decks/DeckStats';
import { DetailTabBar } from '@/components/navigation/DetailTabBar';
import { NotFound } from '@/components/navigation/NotFound';
import { OracleButton } from '@/components/navigation/OracleButton';
import { useTabBarBottom, useTabBarInset } from '@/components/navigation/useTabBarInset';
import { CardSearchSheet } from '@/components/search/CardSearchSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { ManaPips } from '@/components/ui/ManaPips';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { useCardLookup, useDeckSummaries, useMembersById, useOwnershipIndex } from '@/stores/hooks';
import { groupDeckCards } from '@/stores/selectors/ownership';
import { useDeckStore } from '@/stores/useDeckStore';
import { colors, layout, spacing } from '@/theme';
import type { ToastMessage } from '@/types';
import { checkCommanderDeck } from '@/utils/deckLegality';
import { percent, shortDeckName } from '@/utils/format';

const TABS = [
  { value: 'cards', label: 'Cards' },
  { value: 'stats', label: 'Stats' },
] as const;

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDeckStore((s) => s.decks.find((d) => d.id === id));
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const tabBarBottom = useTabBarBottom();
  const summary = useDeckSummaries().get(id);
  const index = useOwnershipIndex();
  const cardOf = useCardLookup();
  const membersById = useMembersById();
  const [tab, setTab] = useState<'cards' | 'stats'>('cards');
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const groups = useMemo(
    () => (deck ? groupDeckCards(deck, index, (cardId) => cardOf(cardId)?.name ?? '') : []),
    [deck, index, cardOf],
  );

  if (!deck) return <NotFound title="Deck not found" message="It may have been deleted on another device." />;

  const commander = cardOf(deck.commanderCardId);
  const legality = checkCommanderDeck(deck, cardOf);
  const size = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  // The first two categories start open; tapping a header flips it.
  const isExpanded = (category: string, position: number) => toggled[category] ?? position < 2;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: tabBarInset }} showsVerticalScrollIndicator={false}>
        <DeckBanner deck={deck} height={layout.heroHeight} showArt />

        <View style={styles.body}>
          <ManaPips colors={commander?.color_identity ?? []} size={22} />
          <Text variant="display" accessibilityRole="header">
            {deck.name}
          </Text>
          <Text variant="body" tone="muted">
            {deck.theme}
          </Text>

          <View style={styles.chips}>
            <Chip label={`Bracket ${deck.bracket}`} size="sm" />
            <Chip label={`${size} cards`} size="sm" />
            <Chip label={`${percent(summary?.ownedRatio ?? 0)} owned`} size="sm" tone="gold" />
            <Chip
              label={legality.legal ? 'Legal' : 'Check legality'}
              size="sm"
              tone={legality.legal ? 'success' : 'missing'}
              accessibilityLabel={legality.legal ? 'Commander legal' : `Not legal yet: ${legality.issues.slice(0, 3).join('; ')}`}
            />
          </View>

          <View style={styles.actions}>
            <Button
              label="Scan into deck"
              icon="scan"
              fullWidth
              onPress={() => router.push({ pathname: '/scan', params: { deckId: deck.id } })}
            />
            <Button label="Search cards" icon="search" variant="secondary" fullWidth onPress={() => setSearching(true)} />
          </View>

          <SegmentedControl options={TABS} value={tab} onChange={setTab} accessibilityLabel="Deck view" />

          {tab === 'cards' ? (
            <View style={styles.sections}>
              {groups.map((group, position) => (
                <CategorySection
                  key={group.category}
                  group={group}
                  expanded={isExpanded(group.category, position)}
                  onToggle={() =>
                    setToggled((prev) => ({ ...prev, [group.category]: !isExpanded(group.category, position) }))
                  }
                  cardOf={cardOf}
                  membersById={membersById}
                />
              ))}
            </View>
          ) : (
            <DeckStats deck={deck} summary={summary} cardOf={cardOf} />
          )}
        </View>
      </ScrollView>

      <View style={[styles.floating, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <IconButton
          icon="back"
          variant="scrim"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.dismissTo('/decks'))}
        />
        <OracleButton variant="scrim" />
      </View>

      <Toast toast={toast} onHide={() => setToast(null)} bottom={tabBarBottom + layout.tabBar.height + spacing.lg} />
      <DetailTabBar active="decks" />

      <CardSearchSheet
        visible={searching}
        onClose={() => setSearching(false)}
        title={`Add to ${shortDeckName(deck.name)}`}
        hint="Cards are stored by name, so any printing you own counts."
        onSelect={async (card) => {
          const result = await useDeckStore.getState().addCard(deck.id, card);
          setToast({
            id: Date.now(),
            message: result === 'added' ? `Added ${card.name}` : `${card.name} is already in this deck`,
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  body: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  sections: {
    gap: spacing.md,
  },
  floating: {
    position: 'absolute',
    left: layout.screenPadding,
    right: layout.screenPadding,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
