import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, manaColors, pipBorder, typography, type ManaColor } from '@/theme';
import { COLOR_NAMES } from '@/utils/mana';

const ORDER: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];

interface ColorFilterProps {
  selected: readonly ManaColor[];
  onChange: (next: ManaColor[]) => void;
}

/** Six multi-select color circles (W U B R G C). None selected = all colors. */
export function ColorFilter({ selected, onChange }: ColorFilterProps) {
  const toggle = (color: ManaColor) =>
    onChange(selected.includes(color) ? selected.filter((c) => c !== color) : [...selected, color]);

  return (
    <View style={styles.row} accessibilityLabel="Filter by color">
      {ORDER.map((color) => {
        const on = selected.includes(color);
        const dimmed = selected.length > 0 && !on;
        return (
          <Pressable
            key={color}
            onPress={() => toggle(color)}
            hitSlop={4}
            accessibilityRole="checkbox"
            accessibilityLabel={COLOR_NAMES[color]}
            accessibilityState={{ checked: on }}
            style={[styles.ring, on && styles.ringOn]}>
            <View style={[styles.circle, { backgroundColor: manaColors[color].fill, opacity: dimmed ? 0.4 : 1 }]}>
              <Text style={[styles.letter, { color: manaColors[color].ink }]} allowFontScaling={false}>
                {color}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ring: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.transparent,
  },
  ringOn: {
    borderColor: colors.gold,
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: pipBorder,
  },
  letter: {
    fontFamily: typography.eyebrow.fontFamily,
    fontSize: 15,
  },
});
