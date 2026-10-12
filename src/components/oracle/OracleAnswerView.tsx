import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ManaPips } from '@/components/ui/ManaPips';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';
import type { OracleAnswer, OracleCardChip } from '@/types';

import { OracleAvatar } from './OracleAvatar';

interface OracleAnswerViewProps {
  answer: OracleAnswer;
  onChipPress: (chip: OracleCardChip) => void;
  onAction?: () => void;
  /** Replaces the action button once it has been used ("Swaps applied"). */
  actionDone?: string;
  actionError?: string;
  actionBusy?: boolean;
}

function CardChip({ chip, onPress }: { chip: OracleCardChip; onPress: () => void }) {
  const friend = chip.tone === 'friend';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${chip.name}, ${chip.note}`}
      accessibilityHint="Opens the card"
      style={({ pressed }) => [styles.chip, friend && styles.chipFriend, pressed && styles.pressed]}>
      <Text variant="label" numberOfLines={1}>
        {chip.name}
      </Text>
      <Text variant="caption" tone={friend ? 'friend' : 'muted'} numberOfLines={1}>
        {chip.note}
      </Text>
    </Pressable>
  );
}

/** A rich Oracle reply: intro, optional featured commander, sections with card chips, action. */
export function OracleAnswerView({
  answer,
  onChipPress,
  onAction,
  actionDone,
  actionError,
  actionBusy,
}: OracleAnswerViewProps) {
  return (
    <View style={styles.row}>
      <OracleAvatar />
      <View style={styles.body}>
        <Text variant="body">{answer.intro}</Text>

        {answer.featured ? (
          <Card variant="oracle" padding={spacing.md}>
            <Text variant="eyebrow" tone="gold">
              Featured commander
            </Text>
            <View style={styles.featuredTitle}>
              <Text variant="title" style={styles.flex} numberOfLines={2}>
                {answer.featured.name}
              </Text>
              <ManaPips colors={answer.featured.colors} size={18} />
            </View>
            <Text variant="caption" tone="secondary">
              {answer.featured.typeLine}
              {answer.featured.stats ? ` · ${answer.featured.stats}` : ''}
            </Text>
            <Text variant="label" tone="goldSoft" style={styles.featuredNote}>
              {answer.featured.note}
            </Text>
          </Card>
        ) : null}

        {answer.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text variant="heading" tone="goldSoft">
              {section.title}
            </Text>
            {section.paragraphs.map((paragraph, index) => (
              <Text key={index} variant="body" tone="secondary">
                {paragraph}
              </Text>
            ))}
            {section.chips ? (
              <View style={styles.chips}>
                {section.chips.map((chip) => (
                  <CardChip key={chip.name} chip={chip} onPress={() => onChipPress(chip)} />
                ))}
              </View>
            ) : null}
          </View>
        ))}

        {actionError ? (
          <Text variant="label" tone="missing" accessibilityLiveRegion="polite">
            {actionError}
          </Text>
        ) : null}
        {answer.action ? (
          actionDone ? (
            <Text variant="label" tone="success" accessibilityLiveRegion="polite">
              {actionDone}
            </Text>
          ) : (
            <Button label={answer.action.label} icon="sparkle" loading={actionBusy} onPress={onAction} style={styles.action} />
          )
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  body: {
    flex: 1,
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  featuredTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  featuredNote: {
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipFriend: {
    backgroundColor: colors.friendBg,
    borderColor: colors.friendBg,
  },
  pressed: {
    opacity: 0.75,
  },
  action: {
    alignSelf: 'flex-start',
  },
});
