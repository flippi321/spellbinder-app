import { Pressable, StyleSheet, View } from 'react-native';

import { DateBadge } from '@/components/home/GameNightStrip';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { goingCount } from '@/stores/selectors/playgroup';
import { colors, radii, spacing } from '@/theme';
import type { GameNight, Rsvp, RsvpStatus } from '@/types';
import { relativeDay, time24 } from '@/utils/format';

const OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: 'going', label: 'Going' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'Can’t' },
];

interface GameNightCardProps {
  gameNight: GameNight;
  rsvps: readonly Rsvp[];
  memberCount: number;
  mine: RsvpStatus | null;
  onRsvp: (status: RsvpStatus) => void;
}

/** Next game: "Thursday · 19:00 at Jonas's · 4 of 5 going" with Going / Maybe / Can't. */
export function GameNightCard({ gameNight, rsvps, memberCount, mine, onRsvp }: GameNightCardProps) {
  const date = new Date(gameNight.startsAt);
  return (
    <Card variant="gold">
      <View style={styles.header}>
        <DateBadge date={date} />
        <View style={styles.text}>
          <Text variant="eyebrow" tone="gold">
            Next game
          </Text>
          <Text variant="heading">
            {relativeDay(date)} · {time24(date)}
          </Text>
          <Text variant="caption" tone="secondary">
            at {gameNight.location} · {goingCount(rsvps)} of {memberCount} going
          </Text>
        </View>
      </View>
      {gameNight.notes ? (
        <Text variant="caption" tone="muted" style={styles.notes}>
          {gameNight.notes}
        </Text>
      ) : null}
      <View style={styles.rsvp} accessibilityRole="radiogroup" accessibilityLabel="Your RSVP">
        {OPTIONS.map((option) => {
          const selected = mine === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onRsvp(option.value)}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected }}
              style={[
                styles.option,
                selected && (option.value === 'going' ? styles.going : styles.selected),
              ]}>
              <Text
                variant="label"
                tone={selected ? (option.value === 'going' ? 'success' : 'goldSoft') : 'secondary'}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  notes: {
    marginTop: spacing.md,
  },
  rsvp: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  option: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  selected: {
    backgroundColor: colors.goldSoftBg,
    borderColor: colors.borderGold,
  },
  going: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBg,
  },
});
