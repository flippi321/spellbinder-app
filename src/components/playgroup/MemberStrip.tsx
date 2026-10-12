import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme';
import type { Profile } from '@/types';

/** Horizontal row of member avatars; you get the gold ring. */
export function MemberStrip({ members, me }: { members: readonly Profile[]; me: string | null }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {members.map((member) => (
        <View key={member.id} style={styles.member}>
          <Avatar profile={member} size={48} ring={member.id === me} />
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {member.displayName}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.lg,
    paddingVertical: spacing.xs,
  },
  member: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 56,
  },
});
