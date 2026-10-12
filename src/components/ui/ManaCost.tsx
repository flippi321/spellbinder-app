import { StyleSheet, View } from 'react-native';

import { isManaColor, parseManaCost } from '@/utils/mana';

import { Pip } from './ManaPips';

interface ManaCostProps {
  cost: string | undefined;
  size?: number;
}

/**
 * Renders a mana cost like "{2}{G}{G}" as pips. Generic/X costs use the colorless pip;
 * hybrid and Phyrexian symbols fall back to their first color.
 * TODO: render Scryfall's official symbol SVGs (https://scryfall.com/docs/api/card-symbols).
 */
export function ManaCost({ cost, size = 16 }: ManaCostProps) {
  const symbols = parseManaCost(cost);
  if (symbols.length === 0) return null;
  return (
    <View style={styles.row} accessible accessibilityLabel={`Mana cost ${symbols.join(' ')}`}>
      {symbols.map((symbol, index) => {
        const color = symbol.split('/').find(isManaColor) ?? 'C';
        const label = isManaColor(symbol) ? symbol : symbol.replace('/', '');
        return <Pip key={`${symbol}-${index}`} color={color} size={size} label={label} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
  },
});
