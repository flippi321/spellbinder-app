import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatBubble } from '@/components/oracle/ChatBubble';
import { OracleAnswerView } from '@/components/oracle/OracleAnswerView';
import { OracleAvatar } from '@/components/oracle/OracleAvatar';
import { Thinking } from '@/components/oracle/Thinking';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { ORACLE_SUGGESTIONS } from '@/services/oracleAnswers';
import { useCardNameLookup } from '@/stores/hooks';
import { useCardStore } from '@/stores/useCardStore';
import { useDeckStore } from '@/stores/useDeckStore';
import { useOracleStore } from '@/stores/useOracleStore';
import { usePlaygroupStore } from '@/stores/usePlaygroupStore';
import { colors, layout, radii, spacing, typography } from '@/theme';
import type { Card as MtgCard, OracleAction, OracleCardChip } from '@/types';
import { getOracleId } from '@/utils/cards';
import { messageOf } from '@/utils/errors';
import { shortDeckName } from '@/utils/format';

async function requireCard(name: string): Promise<MtgCard> {
  const card = await useCardStore.getState().findByName(name);
  if (!card) throw new Error(`Couldn’t find ${name}.`);
  return card;
}

/** Runs an answer's gold action through the stores; resolves to a confirmation line. */
async function runAction(action: OracleAction): Promise<string> {
  switch (action.kind) {
    case 'applySwaps': {
      const deck = useDeckStore.getState().decks.find((d) => d.name === action.deckName);
      if (!deck) throw new Error(`You don’t have ${action.deckName} any more.`);
      const remove = await Promise.all(action.remove.map(async (name) => getOracleId(await requireCard(name))));
      const add = await Promise.all(
        action.add.map(async ({ name, category }) => ({ card: await requireCard(name), category })),
      );
      await useDeckStore.getState().applySwaps(deck.id, remove, add);
      router.push({ pathname: '/deck/[id]', params: { id: deck.id } });
      return `Swaps applied to ${shortDeckName(deck.name)}`;
    }
    case 'createDeck': {
      const deck = await useDeckStore.getState().createDeck(await requireCard(action.commanderName));
      router.push({ pathname: '/deck/[id]', params: { id: deck.id } });
      return `Started a ${shortDeckName(deck.name)} deck`;
    }
    case 'requestLoan': {
      const owner = usePlaygroupStore.getState().members.find((m) => m.displayName === action.ownerName);
      if (!owner) throw new Error(`${action.ownerName} isn’t in your playgroup.`);
      const card = await requireCard(action.cardName);
      await usePlaygroupStore.getState().requestLoan(getOracleId(card), owner.id);
      return `Asked ${owner.displayName} for ${card.name}`;
    }
  }
}

export default function OracleScreen() {
  const { ask } = useLocalSearchParams<{ ask?: string }>();
  const insets = useSafeAreaInsets();
  const messages = useOracleStore((s) => s.messages);
  const busy = useOracleStore((s) => s.busy);
  const cardByName = useCardNameLookup();
  const scroll = useRef<ScrollView>(null);
  const autoAsked = useRef<string | null>(null);
  const [draft, setDraft] = useState('');
  const [actions, setActions] = useState<Record<string, { busy?: boolean; done?: string; error?: string }>>({});

  // Home tiles open the Oracle with ?ask=<suggestion id>.
  useEffect(() => {
    const suggestion = ORACLE_SUGGESTIONS.find((s) => s.id === ask);
    if (!suggestion || autoAsked.current === suggestion.id) return;
    autoAsked.current = suggestion.id;
    void useOracleStore.getState().ask(suggestion.question);
  }, [ask]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    setDraft('');
    void useOracleStore.getState().ask(text);
  };

  const openChip = async (chip: OracleCardChip) => {
    const card = cardByName(chip.name) ?? (await useCardStore.getState().findByName(chip.name));
    if (card) router.push({ pathname: '/card/[id]', params: { id: card.id } });
  };

  const act = async (messageId: string, action: OracleAction) => {
    setActions((prev) => ({ ...prev, [messageId]: { busy: true } }));
    try {
      const done = await runAction(action);
      setActions((prev) => ({ ...prev, [messageId]: { done } }));
    } catch (error) {
      setActions((prev) => ({ ...prev, [messageId]: { error: messageOf(error) } }));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton icon="back" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
        <OracleAvatar size={40} />
        <View style={styles.titles}>
          <Text variant="title" accessibilityRole="header">
            Oracle
          </Text>
          <Text variant="caption" tone="muted">
            Test data · preview
          </Text>
        </View>
        <IconButton
          icon="plus"
          accessibilityLabel="New chat"
          disabled={messages.length === 0}
          onPress={() => {
            useOracleStore.getState().reset();
            setActions({});
          }}
        />
      </View>

      <ScrollView
        ref={scroll}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled">
        {messages.length === 0 ? (
          <Card variant="oracle">
            <Text variant="heading" tone="goldSoft">
              Advice grounded in your binders
            </Text>
            <Text variant="body" tone="secondary" style={styles.introText}>
              The Oracle will review decks, spot commanders and find combos using the cards you and your friends
              actually own. This preview answers the three suggestions below with test data.
            </Text>
          </Card>
        ) : null}
        {messages.map((message) => {
          if (message.role === 'user') return <ChatBubble key={message.id} text={message.text} />;
          const action = message.answer.action;
          const state = actions[message.id];
          return (
            <OracleAnswerView
              key={message.id}
              answer={message.answer}
              onChipPress={(chip) => void openChip(chip)}
              onAction={action ? () => void act(message.id, action) : undefined}
              actionBusy={state?.busy}
              actionDone={state?.done}
              actionError={state?.error}
            />
          );
        })}
        {busy ? <Thinking /> : null}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.suggestions}>
          {ORACLE_SUGGESTIONS.map((suggestion) => (
            <Chip key={suggestion.id} label={suggestion.question} icon="sparkle" onPress={() => send(suggestion.question)} />
          ))}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask the Oracle…"
            placeholderTextColor={colors.textMuted}
            returnKeyType="send"
            onSubmitEditing={() => send(draft)}
            style={styles.input}
            accessibilityLabel="Message the Oracle"
          />
          <IconButton
            icon="send"
            variant="gold"
            accessibilityLabel="Send"
            disabled={!draft.trim() || busy}
            onPress={() => send(draft)}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  titles: {
    flex: 1,
  },
  thread: {
    flex: 1,
  },
  threadContent: {
    padding: layout.screenPadding,
    gap: spacing.xl,
  },
  introText: {
    marginTop: spacing.sm,
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  suggestions: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
  },
  input: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.chip,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
});
