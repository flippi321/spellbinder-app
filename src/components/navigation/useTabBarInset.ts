import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing } from '@/theme';

/** Bottom offset of the floating bar: 20 pt above the safe area. */
export function useTabBarBottom(): number {
  const { bottom } = useSafeAreaInsets();
  return layout.tabBar.bottomOffset + bottom;
}

/** Padding scrollable content needs so its last row clears the floating bar. */
export function useTabBarInset(): number {
  return useTabBarBottom() + layout.tabBar.height + spacing.xl;
}
