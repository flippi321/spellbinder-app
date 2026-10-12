import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

interface SigilProps {
  size?: number;
  color?: string;
}

/** The Spellbinder brand sigil: circle, inscribed diamond, small center circle — stroke only. */
export function Sigil({ size = 28, color = colors.gold }: SigilProps) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Spellbinder" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round">
        <Circle cx={12} cy={12} r={10.5} />
        <Path d="M12 1.5 22.5 12 12 22.5 1.5 12z" />
        <Circle cx={12} cy={12} r={2.6} />
      </Svg>
    </View>
  );
}
