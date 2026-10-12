import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Pill, type PillVariant } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import { goingCount, rsvpOf } from '@/stores/selectors/playgroup';
import { usePlaygroupStore } from '@/stores/usePlaygroupStore';
import { selectUserId, useSessionStore } from '@/stores/useSessionStore';
import { colors, radii, spacing } from '@/theme';
import type { RsvpStatus } from '@/types';
import { time24, weekdayShort } from '@/utils/format';

const RSVP_PILL: Record<RsvpStatus | 'none', { variant: PillVariant; label: string }> = {
  going: { variant: 'success', label: 'Going' },
  maybe: { variant: 'neutral', label: 'Maybe' },
  no: { variant: 'missing', label: 'Can’t' },
  none: { variant: 'neutral', label: 'RSVP' },
};

export function DateBadge({ date }: { date: Date }) {
  return (
    <View style={styles.badge}>
      <Text variant="eyebrow" tone="gold">
        {weekdayShort(date)}
      </Text>
      <Text variant="label" tone="goldSoft">
        {time24(date)}
      </Text>
    </View>
  );
}

/** Home: "THU 19:00 · Game night at Jonas's · 4 of 5 going · Going". */
export function GameNightStrip() {
  const gameNight = usePlaygroupStore((s) => s.gameNight);
  const rsvps = usePlaygroupStore((s) => s.rsvps);
  const memberCount = usePlaygroupStore((s) => s.members.length);
  const status = usePlaygroupStore((s) => s.status);
  const userId = useSessionStore(selectUserId);

  if (!gameNight) {
    return (
      <Card>
        <Text variant="body" tone="muted">
          {status === 'loading' || status === 'idle' ? 'Loading game night…' : 'No game night planned yet'}
        </Text>
      </Card>
    );
  }

  const date = new Date(gameNight.startsAt);
  const pill = RSVP_PILL[(userId && rsvpOf(rsvps, userId)) || 'none'];
  const going = goingCount(rsvps);

  return (
    <Card
      onPress={() => router.navigate('/group')}
      padding={spacing.md}
      accessibilityLabel={`Game night at ${gameNight.location}, ${weekdayShort(date)} ${time24(date)}. ${going} of ${memberCount} going. You: ${pill.label}`}
      accessibilityHint="Opens the playgroup">
      <View style={styles.row}>
        <DateBadge date={date} />
        <View style={styles.text}>
          <Text variant="bodyStrong" numberOfLines={1}>
            Game night at {gameNight.location}
          </Text>
          <Text variant="caption" tone="muted">
            {going} of {memberCount} going
          </Text>
        </View>
        <Pill variant={pill.variant} label={pill.label} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    width: 56,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.goldSoftBg,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
