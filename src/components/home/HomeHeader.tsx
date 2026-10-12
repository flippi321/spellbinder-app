import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { OracleButton } from '@/components/navigation/OracleButton';
import { Avatar } from '@/components/ui/Avatar';
import { Sigil } from '@/components/ui/Sigil';
import { Text } from '@/components/ui/Text';
import { useSessionStore } from '@/stores/useSessionStore';
import { spacing } from '@/theme';
import { greeting } from '@/utils/format';

export function HomeHeader() {
  const user = useSessionStore((s) => s.user);
  return (
    <View style={styles.row}>
      <Sigil size={34} />
      <View style={styles.titles}>
        <Text variant="caption" tone="muted">
          {greeting()}
        </Text>
        <Text variant="title" accessibilityRole="header">
          Planeswalker
        </Text>
      </View>
      <OracleButton />
      {user ? (
        <Avatar
          profile={user}
          size={44}
          ring
          onPress={() => router.push('/about')}
          accessibilityHint="Opens settings and about"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  titles: {
    flex: 1,
  },
});
