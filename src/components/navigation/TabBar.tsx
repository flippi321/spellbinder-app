import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, layout, radii, shadows, spacing } from '@/theme';

import { useKeyboardVisible } from './useKeyboardVisible';
import { useTabBarBottom } from './useTabBarInset';

export type TabKey = 'index' | 'decks' | 'binder' | 'group';

export const TABS: { key: TabKey; label: string; icon: IconName; href: '/' | '/decks' | '/binder' | '/group' }[] = [
  { key: 'index', label: 'Home', icon: 'home', href: '/' },
  { key: 'decks', label: 'Decks', icon: 'decks', href: '/decks' },
  { key: 'binder', label: 'Binder', icon: 'binder', href: '/binder' },
  { key: 'group', label: 'Group', icon: 'group', href: '/group' },
];

interface TabBarProps {
  active: TabKey | null;
  onTabPress: (tab: TabKey) => void;
  onScanPress: () => void;
}

const { height, sideInset, scanSize, scanRaise, scanRing, dot } = layout.tabBar;

/** Floating bottom bar: Home · Decks · [Scan] · Binder · Group (VISION §3). */
export function TabBar({ active, onTabPress, onScanPress }: TabBarProps) {
  const bottom = useTabBarBottom();
  // Android would otherwise lift the floating bar above the keyboard (e.g. while searching).
  const keyboardOpen = useKeyboardVisible();
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);
  if (keyboardOpen && Platform.OS === 'android') return null;

  const renderTab = (tab: (typeof TABS)[number]) => {
    const selected = tab.key === active;
    const tint = selected ? colors.gold : colors.tabInactive;
    return (
      <Pressable
        key={tab.key}
        onPress={() => onTabPress(tab.key)}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected }}
        style={styles.tab}>
        <Icon name={tab.icon} size={22} color={tint} />
        <Text variant="caption" style={[styles.label, { color: tint }]}>
          {tab.label}
        </Text>
        <View style={[styles.dot, { backgroundColor: selected ? colors.gold : colors.transparent }]} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { bottom }]} accessibilityRole="tablist">
      <View style={styles.clip} pointerEvents="none">
        {Platform.OS === 'ios' ? <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]} />
      </View>
      <View style={styles.row}>
        {left.map(renderTab)}
        <View style={styles.scanSlot} />
        {right.map(renderTab)}
      </View>
      <Pressable
        onPress={onScanPress}
        accessibilityRole="button"
        accessibilityLabel="Scan a card"
        accessibilityHint="Opens the camera to add cards"
        style={({ pressed }) => [styles.scanRing, pressed && styles.pressed]}>
        <View style={styles.scanButton}>
          <Icon name="scan" size={28} color={colors.goldInk} strokeWidth={2} />
        </View>
      </Pressable>
    </View>
  );
}

const ringSize = scanSize + scanRing * 2;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: sideInset,
    right: sideInset,
    height,
    borderRadius: radii.bar,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.bar,
  },
  clip: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.bar,
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    height,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 11,
    lineHeight: 13,
  },
  dot: {
    width: dot,
    height: dot,
    borderRadius: dot / 2,
  },
  scanSlot: {
    width: ringSize,
  },
  scanRing: {
    position: 'absolute',
    top: -scanRaise,
    alignSelf: 'center',
    width: ringSize,
    height: ringSize,
    borderRadius: ringSize / 2,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButton: {
    width: scanSize,
    height: scanSize,
    borderRadius: scanSize / 2,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
