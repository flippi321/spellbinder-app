import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrintingsSheet } from '@/components/card/PrintingsSheet';
import { DeckPickerSheet } from '@/components/decks/DeckPickerSheet';
import { DetailTabBar } from '@/components/navigation/DetailTabBar';
import { OracleButton } from '@/components/navigation/OracleButton';
import { useTabBarBottom, useTabBarInset } from '@/components/navigation/useTabBarInset';
import { AvatarStack } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardImage } from '@/components/ui/CardImage';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { ManaCost } from '@/components/ui/ManaCost';
import { Stepper } from '@/components/ui/Stepper';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { useMembersById } from '@/stores/hooks';
import { useCard, useCardStore } from '@/stores/useCardStore';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { useDeckStore } from '@/stores/useDeckStore';
import { usePlaygroupStore } from '@/stores/usePlaygroupStore';
import { colors, layout, radii, spacing } from '@/theme';
import type { Profile, ToastMessage } from '@/types';
import { getCardFaces, getOracleId, isCommanderLegal } from '@/utils/cards';
import { joinNames, shortDeckName } from '@/utils/format';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const card = useCard(id);
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const tabBarBottom = useTabBarBottom();
  const items = useCollectionStore((s) => s.items);
  const decks = useDeckStore((s) => s.decks);
  const memberItems = usePlaygroupStore((s) => s.memberItems);
  const membersById = useMembersById();
  const [showPrintings, setShowPrintings] = useState(false);
  const [pickingDeck, setPickingDeck] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Cards opened from search/Oracle may not be cached yet.
  useEffect(() => {
    if (!card && id) void useCardStore.getState().ensureIds([id]);
  }, [card, id]);

  const back = () => (router.canGoBack() ? router.back() : router.dismissTo('/binder'));

  const floating = (
    <View style={[styles.floating, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
      <IconButton icon="back" variant="scrim" accessibilityLabel="Back" onPress={back} />
      <OracleButton variant="scrim" />
    </View>
  );

  if (!card) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.gold} />
        {floating}
      </View>
    );
  }

  const oracleId = getOracleId(card);
  const owned = items.filter((item) => item.oracleId === oracleId).reduce((sum, item) => sum + item.quantity, 0);
  const inDecks = decks.filter((deck) => deck.cards.some((c) => c.oracleId === oracleId));
  const friendIds = [...new Set(memberItems.filter((i) => i.oracleId === oracleId && i.quantity > 0).map((i) => i.userId))];
  const friends = friendIds.map((friendId) => membersById.get(friendId)).filter((p): p is Profile => Boolean(p));
  const faces = getCardFaces(card);
  const legal = isCommanderLegal(card);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 64, paddingBottom: tabBarInset }]}
        showsVerticalScrollIndicator={false}>
        <CardImage card={card} size="large" radius={radii.lg} priority="high" style={styles.image} />

        <View style={styles.titleRow}>
          <Text variant="display" accessibilityRole="header" style={styles.flex}>
            {card.name}
          </Text>
          <ManaCost cost={card.mana_cost ?? faces[0].mana_cost} size={18} />
        </View>
        <View style={styles.chips}>
          <Chip
            label={legal ? 'Commander legal' : 'Not legal in Commander'}
            tone={legal ? 'success' : 'missing'}
            size="sm"
          />
          <Chip label={`${card.set.toUpperCase()} · #${card.collector_number}`} size="sm" />
        </View>
        <Text variant="body" tone="secondary">
          {card.type_line}
        </Text>

        <Card variant="raised" style={styles.textPanel}>
          {faces.map((face, index) => (
            <View key={face.name + index} style={index > 0 ? styles.faceDivider : undefined}>
              {faces.length > 1 ? (
                <Text variant="heading" style={styles.faceName}>
                  {face.name}
                </Text>
              ) : null}
              {(face.oracle_text ?? '').split('\n').map((line, lineIndex) => (
                <Text key={lineIndex} variant="body" style={styles.paragraph}>
                  {line}
                </Text>
              ))}
              {face.power && face.toughness ? (
                <Text variant="bodyStrong" align="right">
                  {face.power}/{face.toughness}
                </Text>
              ) : null}
              {face.loyalty ? (
                <Text variant="bodyStrong" align="right">
                  Loyalty {face.loyalty}
                </Text>
              ) : null}
            </View>
          ))}
          {card.artist ? (
            <Text variant="caption" tone="muted">
              Illustrated by {card.artist}
            </Text>
          ) : null}
        </Card>

        <Card style={styles.binderRow}>
          <View style={styles.flex}>
            <Text variant="bodyStrong">In your binder</Text>
            <Text variant="caption" tone="muted">
              All printings and foils
            </Text>
          </View>
          <Stepper
            value={owned}
            label="copies in your binder"
            onChange={(next) => void useCollectionStore.getState().changeQuantity(card, next > owned ? 1 : -1)}
          />
        </Card>

        <View style={styles.section}>
          <Text variant="eyebrow">In your decks</Text>
          {inDecks.length === 0 ? (
            <Text variant="body" tone="muted">
              Not in any deck yet.
            </Text>
          ) : (
            <View style={styles.chips}>
              {inDecks.map((deck) => (
                <Chip
                  key={deck.id}
                  label={shortDeckName(deck.name)}
                  icon="decks"
                  onPress={() => router.push({ pathname: '/deck/[id]', params: { id: deck.id } })}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.friends}>
          {friends.length > 0 ? <AvatarStack profiles={friends} /> : null}
          <Text variant="body" tone={friends.length > 0 ? 'friend' : 'muted'} style={styles.flex}>
            {friends.length > 0
              ? `${joinNames(friends.map((f) => f.displayName))} ${friends.length === 1 ? 'owns' : 'own'} it too`
              : 'None of your friends own it'}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Other printings" variant="secondary" fullWidth onPress={() => setShowPrintings(true)} />
          <Button label="Add to deck" icon="plus" fullWidth onPress={() => setPickingDeck(true)} />
        </View>
      </ScrollView>

      {floating}
      <Toast toast={toast} onHide={() => setToast(null)} bottom={tabBarBottom + layout.tabBar.height + spacing.lg} />
      <DetailTabBar active="binder" />

      <PrintingsSheet
        visible={showPrintings}
        onClose={() => setShowPrintings(false)}
        oracleId={oracleId}
        currentId={card.id}
        onPick={(printing) => router.setParams({ id: printing.id })}
      />
      <DeckPickerSheet
        visible={pickingDeck}
        onClose={() => setPickingDeck(false)}
        title="Add to deck"
        containsOracleId={oracleId}
        onSelect={async (value) => {
          if (value === 'binder') return;
          const deck = decks.find((d) => d.id === value.deckId);
          const result = await useDeckStore.getState().addCard(value.deckId, card);
          const name = shortDeckName(deck?.name ?? 'deck');
          setToast({
            id: Date.now(),
            message: result === 'added' ? `Added to ${name}` : `Already in ${name}`,
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
  },
  image: {
    width: '76%',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  textPanel: {
    gap: spacing.sm,
  },
  faceDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  faceName: {
    marginBottom: spacing.xs,
  },
  paragraph: {
    marginBottom: spacing.xs,
  },
  binderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  friends: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  floating: {
    position: 'absolute',
    left: layout.screenPadding,
    right: layout.screenPadding,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
