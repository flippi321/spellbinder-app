import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/navigation/useTabBarInset';
import { colors, layout, spacing } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default). */
  scroll?: boolean;
  /** Add bottom padding so content clears the floating tab bar. */
  withTabBar?: boolean;
  /** Apply the 20-pt screen padding. */
  padded?: boolean;
  /** Pad for the top safe area (off for screens with a full-bleed hero). */
  safeTop?: boolean;
  scrollRef?: Ref<ScrollView>;
  contentStyle?: StyleProp<ViewStyle>;
  background?: string;
}

/** Screen shell: background, safe areas, optional scroll and tab-bar clearance. */
export function Screen({
  children,
  scroll = true,
  withTabBar = false,
  padded = true,
  safeTop = true,
  scrollRef,
  contentStyle,
  background = colors.bg,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const padding: ViewStyle = {
    paddingTop: (safeTop ? insets.top : 0) + (padded ? spacing.sm : 0),
    paddingBottom: withTabBar ? tabBarInset : insets.bottom + spacing.xl,
    paddingHorizontal: padded ? layout.screenPadding : 0,
  };

  if (!scroll) {
    return <View style={[styles.fill, { backgroundColor: background }, padding, contentStyle]}>{children}</View>;
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.fill, { backgroundColor: background }]}
      contentContainerStyle={[padding, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never">
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
