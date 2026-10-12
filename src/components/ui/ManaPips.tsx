import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { manaColors, pipBorder, typography, type ManaColor } from '@/theme';
import { COLOR_NAMES, sortColors } from '@/utils/mana';

import { Text } from './Text';

export function Pip({ color, size = 18, label }: { color: ManaColor; size?: number; label?: string }) {
  const c = manaColors[color];
  return (
    <View
      style={[
        styles.pip,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: c.fill },
      ]}>
      <Text
        style={[styles.letter, { fontSize: Math.round(size * (label && label.length > 1 ? 0.42 : 0.55)), color: c.ink }]}
        allowFontScaling={false}>
        {label ?? color}
      </Text>
    </View>
  );
}

interface ManaPipsProps {
  /** Color identity, e.g. ['W','U','B','G']. Empty means colorless. */
  colors: readonly string[];
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Color-identity pips: letter in a circle with a faint white border. */
export function ManaPips({ colors, size = 18, style }: ManaPipsProps) {
  const sorted = sortColors(colors);
  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={`Colors: ${sorted.map((c) => COLOR_NAMES[c]).join(', ')}`}>
      {sorted.map((color) => (
        <Pip key={color} color={color} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 3,
  },
  pip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: pipBorder,
  },
  letter: {
    fontFamily: typography.eyebrow.fontFamily,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
