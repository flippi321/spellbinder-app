import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';
import type { Profile } from '@/types';

interface LogGameSheetProps {
  visible: boolean;
  onClose: () => void;
  members: readonly Profile[];
  onLog: (winnerId: string) => Promise<void>;
}

/** "Log a game": pick who won. */
export function LogGameSheet({ visible, onClose, members, onLog }: LogGameSheetProps) {
  const [winner, setWinner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setWinner(null);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title="Log a game">
      <Text variant="body" tone="muted">
        Who won?
      </Text>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {members.map((member) => {
          const selected = winner === member.id;
          return (
            <Pressable
              key={member.id}
              onPress={() => setWinner(member.id)}
              accessibilityRole="radio"
              accessibilityLabel={member.displayName}
              accessibilityState={{ checked: selected }}
              style={[styles.member, selected && styles.selected]}>
              <Avatar profile={member} size={40} ring={selected} />
              <Text variant="label" tone={selected ? 'goldSoft' : 'secondary'}>
                {member.displayName}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        label="Save game"
        disabled={!winner}
        loading={saving}
        onPress={async () => {
          if (!winner) return;
          setSaving(true);
          try {
            await onLog(winner);
            close();
          } finally {
            setSaving(false);
          }
        }}
        style={styles.save}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  member: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: {
    borderColor: colors.borderGold,
    backgroundColor: colors.goldSoftBg,
  },
  save: {
    marginTop: spacing.lg,
  },
});
