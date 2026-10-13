import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AvatarStack } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CardImage } from '@/components/ui/CardImage';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { whoHas } from '@/stores/selectors/playgroup';
import { colors, radii, spacing, typography } from '@/theme';
import type { Card, CollectionItem, LoanRequest, Profile } from '@/types';

interface WhoHasItPanelProps {
  me: string;
  myItems: readonly CollectionItem[];
  memberItems: readonly CollectionItem[];
  loans: readonly LoanRequest[];
  membersById: ReadonlyMap<string, Profile>;
  cardOf: (cardId: string) => Card | undefined;
  onAsk: (cardId: string, ownerId: string) => Promise<void>;
}

/** Search every collection in the group; "Ask" sends a borrow request. */
export function WhoHasItPanel({ me, myItems, memberItems, loans, membersById, cardOf, onAsk }: WhoHasItPanelProps) {
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState<string | null>(null);
  const items = useMemo(() => [...myItems, ...memberItems], [myItems, memberItems]);
  const results = useMemo(() => whoHas(query, items, (cardId) => cardOf(cardId)?.name), [query, items, cardOf]);
  const asked = (cardId: string) =>
    loans.some((loan) => loan.requesterId === me && loan.cardId === cardId && loan.status === 'pending');

  return (
    <View style={styles.stack}>
      <View style={styles.search}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Who has… (e.g. Sol Ring)"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          style={styles.input}
          accessibilityLabel="Search the group's collections"
        />
      </View>
      {query.trim().length < 2 ? (
        <Text variant="body" tone="muted">
          Search every binder in the group before you buy.
        </Text>
      ) : results.length === 0 ? (
        <Text variant="body" tone="muted">
          Nobody in the group has a card matching “{query.trim()}”.
        </Text>
      ) : (
        results.map((result) => {
          const card = cardOf(result.cardId);
          const friends = result.owners
            .filter((owner) => owner.userId !== me)
            .sort((a, b) => b.quantity - a.quantity);
          const mine = result.owners.find((owner) => owner.userId === me);
          const ownerProfiles = result.owners
            .map((owner) => membersById.get(owner.userId))
            .filter((p): p is Profile => Boolean(p));
          const target = friends[0];
          const alreadyAsked = asked(result.cardId);
          return (
            <View key={result.cardId} style={styles.row}>
              <Pressable
                onPress={card ? () => router.push({ pathname: '/card/[id]', params: { id: card.id } }) : undefined}
                accessibilityRole="button"
                accessibilityLabel={`${result.name}, owned by ${ownerProfiles.map((p) => p.displayName).join(', ')}`}
                style={styles.cardInfo}>
                <CardImage card={card} size="small" style={styles.thumb} radius={radii.sm / 2} showPlaceholderLabel={false} />
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {result.name}
                  </Text>
                  <View style={styles.owners}>
                    <AvatarStack profiles={ownerProfiles} size={22} />
                    <Text variant="caption" tone={mine ? 'gold' : 'muted'} numberOfLines={1} style={styles.flex}>
                      {mine ? `You have ${mine.quantity}` : `${friends.length} ${friends.length === 1 ? 'friend' : 'friends'}`}
                    </Text>
                  </View>
                </View>
              </Pressable>
              {target ? (
                <Button
                  label={alreadyAsked ? 'Asked' : 'Ask'}
                  size="sm"
                  variant={alreadyAsked ? 'secondary' : 'primary'}
                  disabled={alreadyAsked}
                  loading={asking === result.cardId}
                  accessibilityLabel={
                    alreadyAsked
                      ? `Already asked for ${result.name}`
                      : `Ask ${membersById.get(target.userId)?.displayName ?? 'a friend'} to borrow ${result.name}`
                  }
                  onPress={async () => {
                    setAsking(result.cardId);
                    try {
                      await onAsk(result.cardId, target.userId);
                    } finally {
                      setAsking(null);
                    }
                  }}
                />
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  thumb: {
    width: 36,
  },
  owners: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
