import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

interface ShutterProps {
  onPress: () => void;
  busy: boolean;
}

/** The big capture button. */
export function Shutter({ onPress, busy }: ShutterProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Scan card"
      accessibilityHint="Takes a photo and identifies the card"
      accessibilityState={{ busy, disabled: busy }}
      style={({ pressed }) => [styles.ring, pressed && styles.pressed]}>
      <View style={styles.button}>{busy ? <ActivityIndicator color={colors.goldInk} /> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  button: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
