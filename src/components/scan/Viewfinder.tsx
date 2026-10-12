import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/components/ui/useReduceMotion';
import { colors, layout, radii, shadows } from '@/theme';

interface ViewfinderProps {
  width: number;
  /** Animate the scan line. */
  active: boolean;
  /** Content inside the frame (camera placeholders). */
  children?: ReactNode;
}

const CORNER = 30;
const STROKE = 3;

/** Card-shaped (63:88) frame with gold corner brackets and a sweeping scan line. */
export function Viewfinder({ width, active, children }: ViewfinderProps) {
  const height = width / layout.cardAspect;
  const reduceMotion = useReduceMotion();
  const [sweep] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active || reduceMotion) return;
    const ease = Easing.inOut(Easing.quad);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1700, easing: ease, useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1700, easing: ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduceMotion, sweep]);

  return (
    <View
      style={{ width, height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Viewfinder. Fit the card inside the frame.">
      <View style={styles.outline} />
      {children}
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />
      {active && !reduceMotion ? (
        <Animated.View
          style={[
            styles.line,
            {
              transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [14, height - 16] }) }],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outline: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.viewfinderLine,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.gold,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: STROKE,
    borderLeftWidth: STROKE,
    borderTopLeftRadius: radii.lg,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: STROKE,
    borderRightWidth: STROKE,
    borderTopRightRadius: radii.lg,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: STROKE,
    borderLeftWidth: STROKE,
    borderBottomLeftRadius: radii.lg,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: STROKE,
    borderRightWidth: STROKE,
    borderBottomRightRadius: radii.lg,
  },
  line: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.gold,
    boxShadow: shadows.scanLine,
  },
});
