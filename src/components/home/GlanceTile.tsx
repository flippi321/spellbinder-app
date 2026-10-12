import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';

interface GlanceTileProps {
  label: string;
  icon: IconName;
  onPress: () => void;
  /** Big Cinzel number ("1,284"). */
  value?: string;
  /** Small gold label above the text (Oracle tip). */
  eyebrow?: string;
  variant?: 'default' | 'oracle';
  accessibilityHint?: string;
}

/** One of the four "At a glance" tiles on Home. */
export function GlanceTile({ label, icon, onPress, value, eyebrow, variant = 'default', accessibilityHint }: GlanceTileProps) {
  const oracle = variant === 'oracle';
  return (
    <Card
      variant={oracle ? 'gold' : 'default'}
      onPress={onPress}
      padding={spacing.md + 2}
      style={styles.tile}
      accessibilityLabel={[eyebrow, value, label].filter(Boolean).join(' ')}
      accessibilityHint={accessibilityHint}>
      <View style={[styles.icon, oracle && styles.iconGold]}>
        <Icon name={icon} size={18} color={oracle ? colors.gold : colors.textSecondary} filled={oracle} />
      </View>
      <View style={styles.text}>
        {eyebrow ? (
          <Text variant="eyebrow" tone="gold">
            {eyebrow}
          </Text>
        ) : null}
        {value ? <Text variant="number">{value}</Text> : null}
        <Text variant={oracle ? 'heading' : 'caption'} tone={oracle ? 'goldSoft' : 'secondary'} numberOfLines={3}>
          {label}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 132,
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  iconGold: {
    backgroundColor: colors.goldSoftBg,
  },
  text: {
    gap: 2,
  },
});
