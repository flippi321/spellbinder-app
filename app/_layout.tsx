import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { config } from '@/config';
import { bootstrapApp, useStoresHydrated } from '@/stores/bootstrap';
import { useSessionStore } from '@/stores/useSessionStore';
import { colors, fontAssets, navigationTheme } from '@/theme';

// Keep the splash up until fonts and persisted stores are ready.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 250 });

const requiresSignIn = config.dataMode === 'supabase';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const hydrated = useStoresHydrated();
  const status = useSessionStore((s) => s.status);

  // Supabase mode: also wait for the stored session, so a signed-out user never sees Home flash by.
  // Latched, so a later session reload never unmounts the app.
  const [sessionChecked, setSessionChecked] = useState(!requiresSignIn);
  if (!sessionChecked && status !== 'idle' && status !== 'loading') setSessionChecked(true);

  const ready = (fontsLoaded || fontError !== null) && hydrated && sessionChecked;
  const signedOut = requiresSignIn && status === 'signedOut';

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
        <Stack.Protected guard={!signedOut}>
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
        </Stack.Protected>
        <Stack.Protected guard={signedOut}>
          <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
