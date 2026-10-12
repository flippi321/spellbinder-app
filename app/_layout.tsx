import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { bootstrapApp, useStoresHydrated } from '@/stores/bootstrap';
import { colors, fontAssets, navigationTheme } from '@/theme';

// Keep the splash up until fonts and persisted stores are ready.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 250 });

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const hydrated = useStoresHydrated();
  const ready = (fontsLoaded || fontError !== null) && hydrated;

  useEffect(() => {
    if (hydrated) void bootstrapApp();
  }, [hydrated]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="deck/[id]" />
        <Stack.Screen name="card/[id]" />
        <Stack.Screen name="oracle" />
        <Stack.Screen name="about" />
        <Stack.Screen
          name="scan"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            contentStyle: { backgroundColor: colors.bgCamera },
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
