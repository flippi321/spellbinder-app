import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

export type IconName =
  | 'home'
  | 'decks'
  | 'binder'
  | 'group'
  | 'scan'
  | 'sparkle'
  | 'search'
  | 'back'
  | 'close'
  | 'flash'
  | 'plus'
  | 'minus'
  | 'check'
  | 'chevron'
  | 'import'
  | 'share'
  | 'send'
  | 'mail'
  | 'lock'
  | 'user'
  | 'eye'
  | 'eyeOff';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Fill closed shapes (e.g. an active flash or the sparkle on a gold button). */
  filled?: boolean;
  /** Only for `chevron`. */
  direction?: 'right' | 'down' | 'left' | 'up';
  style?: StyleProp<ViewStyle>;
}

const ROTATION = { right: '0deg', down: '90deg', left: '180deg', up: '270deg' } as const;

function glyph(name: IconName, fill: string): ReactNode {
  switch (name) {
    case 'home':
      return (
        <>
          <Path d="M3.5 10.5 12 3.5l8.5 7" />
          <Path d="M5.5 9v10.5a1 1 0 0 0 1 1h3.5v-6h4v6h3.5a1 1 0 0 0 1-1V9" />
        </>
      );
    case 'decks':
      return (
        <>
          <Rect x={8} y={3} width={12} height={16} rx={2} />
          <Path d="M5 6.5V19a2 2 0 0 0 2 2h9.5" />
        </>
      );
    case 'binder':
      return (
        <>
          <Rect x={4} y={3} width={16} height={18} rx={2} />
          <Path d="M12 3v18M4 12h16" />
        </>
      );
    case 'group':
      return (
        <>
          <Circle cx={9} cy={8} r={3.5} />
          <Path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <Circle cx={17} cy={9} r={2.5} />
          <Path d="M16 14.1a5 5 0 0 1 5.5 5.4" />
        </>
      );
    case 'scan':
      return (
        <>
          <Path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
          <Path d="M7 12h10" />
        </>
      );
    case 'sparkle':
      return (
        <>
          <Path
            d="M11 3.5l1.6 5.4a2 2 0 0 0 1.4 1.4l5.4 1.6-5.4 1.6a2 2 0 0 0-1.4 1.4L11 20.3l-1.6-5.4a2 2 0 0 0-1.4-1.4L2.6 11.9l5.4-1.6a2 2 0 0 0 1.4-1.4z"
            fill={fill}
          />
          <Path d="M19 2.5v4M17 4.5h4" />
        </>
      );
    case 'search':
      return (
        <>
          <Circle cx={11} cy={11} r={6.5} />
          <Path d="M20 20l-4.3-4.3" />
        </>
      );
    case 'back':
      return <Path d="M15 5l-7 7 7 7" />;
    case 'close':
      return <Path d="M6 6l12 12M18 6 6 18" />;
    case 'flash':
      return <Path d="M13 2.5 5 13.5h6.5L11 21.5l8-11h-6.5z" fill={fill} />;
    case 'plus':
      return <Path d="M12 5v14M5 12h14" />;
    case 'minus':
      return <Path d="M5 12h14" />;
    case 'check':
      return <Path d="M5 12.5l4.5 4.5L19 7.5" />;
    case 'chevron':
      return <Path d="M9 5l7 7-7 7" />;
    case 'import':
      return <Path d="M12 3.5v11M7.5 10 12 14.5 16.5 10M4 15.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />;
    case 'share':
      return <Path d="M12 14.5V3.5M7.5 8 12 3.5 16.5 8M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />;
    case 'send':
      return <Path d="M12 19V5.5M5.5 12 12 5.5l6.5 6.5" />;
    case 'mail':
      return (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={2} />
          <Path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect x={4.5} y={10.5} width={15} height={10} rx={2} />
          <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        </>
      );
    case 'user':
      return (
        <>
          <Circle cx={12} cy={8} r={4} />
          <Path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
        </>
      );
    case 'eye':
      return (
        <>
          <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
          <Circle cx={12} cy={12} r={3} />
        </>
      );
    case 'eyeOff':
      return (
        <>
          <Path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 6.9C4 8.6 2.5 12 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 4.9-1.4" />
          <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3.5 3.5l17 17" />
        </>
      );
  }
}

/** Inline stroke icons (24-unit grid). No icon fonts, no brand marks. */
export function Icon({
  name,
  size = 22,
  color = colors.text,
  strokeWidth = 1.75,
  filled = false,
  direction = 'right',
  style,
}: IconProps) {
  const rotation = name === 'chevron' ? ROTATION[direction] : '0deg';
  // Decorative: the surrounding control carries the accessibility label.
  return (
    <View
      style={[{ width: size, height: size, transform: [{ rotate: rotation }] }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none">
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round">
        {glyph(name, filled ? color : 'none')}
      </Svg>
    </View>
  );
}
