import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardImage } from '@/components/ui/CardImage';
import { Pill } from '@/components/ui/Pill';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { activeLoans, incomingRequests, outgoingRequests } from '@/stores/selectors/playgroup';
import { colors, radii, spacing } from '@/theme';
import type { Card as MtgCard, LoanRequest, Profile } from '@/types';

interface LendingPanelProps {
  loans: readonly LoanRequest[];
  me: string;
  membersById: ReadonlyMap<string, Profile>;
  cardOf: (cardId: string) => MtgCard | undefined;
  onRespond: (loanId: string, decision: 'lent' | 'declined') => void;
}

/** Incoming borrow requests, outgoing asks, and what's currently on loan. */
export function LendingPanel({ loans, me, membersById, cardOf, onRespond }: LendingPanelProps) {
  const incoming = incomingRequests(loans, me);
  const outgoing = outgoingRequests(loans, me);
  const onLoan = activeLoans(loans, me);
  const nameOf = (userId: string) => membersById.get(userId)?.displayName ?? 'A friend';
  const cardName = (cardId: string) => cardOf(cardId)?.name ?? 'a card';
  const rows = [
    ...onLoan,
    ...outgoing.map((loan) => ({ loan, direction: 'asked' as const, otherId: loan.ownerId })),
  ];
  const describe = {
    borrowed: { prefix: 'From', pill: 'friend', label: 'Borrowed' },
    lent: { prefix: 'To', pill: 'neutral', label: 'Lent' },
    asked: { prefix: 'Asked', pill: 'missing', label: 'Pending' },
  } as const;

  return (
    <View style={styles.stack}>
      {incoming.length === 0 ? null : (
        <View style={styles.stack}>
          <SectionHeader title="Requests" />
          {incoming.map((loan) => {
            const requester = membersById.get(loan.requesterId);
            return (
              <Card key={loan.id} variant="gold">
                <View style={styles.row}>
                  {requester ? <Avatar profile={requester} size={40} /> : null}
                  <Text variant="bodyStrong" style={styles.flex}>
                    {nameOf(loan.requesterId)} wants to borrow{' '}
                    <Text variant="bodyStrong" tone="goldSoft">
                      {cardName(loan.cardId)}
                    </Text>
                  </Text>
                </View>
                {loan.note ? (
                  <Text variant="caption" tone="muted" style={styles.note}>
                    “{loan.note}”
                  </Text>
                ) : null}
                <View style={styles.buttons}>
                  <Button label="Decline" variant="secondary" fullWidth onPress={() => onRespond(loan.id, 'declined')} />
                  <Button label="Lend it" fullWidth onPress={() => onRespond(loan.id, 'lent')} />
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <SectionHeader title="On loan" />
      {rows.length === 0 ? (
        <Text variant="body" tone="muted">
          Nothing lent or borrowed right now.
        </Text>
      ) : null}
      {rows.map(({ loan, direction, otherId }) => {
        const card = cardOf(loan.cardId);
        const d = describe[direction];
        const detail = `${d.prefix} ${nameOf(otherId)}`;
        return (
          <Pressable
            key={loan.id}
            onPress={card ? () => router.push({ pathname: '/card/[id]', params: { id: card.id } }) : undefined}
            accessibilityRole="button"
            accessibilityLabel={`${card?.name ?? 'Card'}, ${d.label}, ${detail}`}
            style={({ pressed }) => [styles.loanRow, pressed && styles.pressed]}>
            <CardImage card={card} size="small" style={styles.thumb} radius={radii.sm / 2} showPlaceholderLabel={false} />
            <View style={styles.flex}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {card?.name ?? '…'}
              </Text>
              <Text variant="caption" tone="muted">
                {detail}
              </Text>
            </View>
            <Pill variant={d.pill} label={d.label} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  note: {
    marginTop: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  loanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  thumb: {
    width: 36,
  },
});
