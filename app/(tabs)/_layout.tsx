import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';

import { TabBar, type TabKey } from '@/components/navigation/TabBar';
import { colors } from '@/theme';

function NavigatorTabBar({ state, navigation }: BottomTabBarProps) {
  const current = state.routes[state.index]?.name as TabKey | undefined;
  return (
    <TabBar
      active={current ?? null}
      onTabPress={(key) => {
        const route = state.routes.find((r) => r.name === key);
        if (!route) return;
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (current !== key && !event.defaultPrevented) navigation.navigate(route.name, route.params);
      }}
      onScanPress={() => router.push('/scan')}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <NavigatorTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="decks" options={{ title: 'Decks' }} />
      <Tabs.Screen name="binder" options={{ title: 'Binder' }} />
      <Tabs.Screen name="group" options={{ title: 'Group' }} />
    </Tabs>
  );
}
