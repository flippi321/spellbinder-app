import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useReduceMotion } from '@/components/ui/useReduceMotion';
import { spacing } from '@/theme';

import { OracleAvatar } from './OracleAvatar';

/** "Consulting your binders…" while the Oracle answers. */
export function Thinking() {
  const reduceMotion = useReduceMotion();
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  return (
    <View style={styles.row} accessibilityLiveRegion="polite" accessibilityLabel="Consulting your binders">
      <OracleAvatar />
      <Animated.View style={{ opacity: pulse }}>
        <Text variant="body" tone="muted">
          Consulting your binders…
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
