import { router } from 'expo-router';

import { TABS, TabBar, type TabKey } from './TabBar';

/**
 * The floating bar on detail routes (deck/[id], card/[id]) that live outside the tab
 * navigator. Tapping a tab pops back to the tabs and switches to the chosen one.
 */
export function DetailTabBar({ active }: { active: TabKey }) {
  return (
    <TabBar
      active={active}
      onTabPress={(key) => {
        const tab = TABS.find((t) => t.key === key);
        if (tab) router.dismissTo(tab.href);
      }}
      onScanPress={() => router.push('/scan')}
    />
  );
}
