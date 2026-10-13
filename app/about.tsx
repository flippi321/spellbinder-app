import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Sigil } from '@/components/ui/Sigil';
import { Text } from '@/components/ui/Text';
import { config } from '@/config';
import { resetDemoData } from '@/stores/bootstrap';
import { useSessionStore } from '@/stores/useSessionStore';
import { spacing } from '@/theme';

const FAN_CONTENT_POLICY = 'https://company.wizards.com/en/legal/fancontentpolicy';
const SCRYFALL = 'https://scryfall.com';

export default function AboutScreen() {
  const user = useSessionStore((s) => s.user);
  const signOut = useSessionStore((s) => s.signOut);
  const [resetting, setResetting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const version = Constants.expoConfig?.version ?? '0.0.0';

  const reset = async () => {
    setResetting(true);
    try {
      await resetDemoData();
    } finally {
      setResetting(false);
    }
  };

  const confirmReset = () => {
    if (Platform.OS === 'web') {
      void reset();
      return;
    }
    Alert.alert('Reset demo data?', 'Your binder, decks and scans go back to the sample data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => void reset() },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="back" variant="ghost" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text variant="title" accessibilityRole="header">
          About
        </Text>
      </View>

      <View style={styles.hero}>
        <Sigil size={56} />
        <Text variant="display">Spellbinder</Text>
        <Text variant="caption" tone="muted">
          Version {version}
        </Text>
        <Text variant="body" tone="secondary" align="center">
          A free, non-commercial Commander companion for a small group of friends. It will never be monetized.
        </Text>
      </View>

      <Card style={styles.card}>
        <Text variant="eyebrow">Account & data</Text>
        <Text variant="body">
          {user ? `Signed in as ${user.displayName}` : 'Not signed in'}
          {config.dataMode === 'mock' ? ' (demo profile)' : ''}
        </Text>
        <Text variant="caption" tone="muted">
          Data: {config.dataMode === 'mock' ? 'sample data on this device' : 'Supabase'} · Oracle:{' '}
          {config.oracleMode === 'mock' ? 'preview answers' : 'Edge Function'}
        </Text>
        {config.dataMode === 'mock' ? (
          <Button
            label="Reset demo data"
            variant="secondary"
            size="sm"
            loading={resetting}
            onPress={confirmReset}
            style={styles.button}
          />
        ) : (
          // Signing out flips the root layout's auth gate, which shows the sign-in screen.
          <Button
            label="Sign out"
            variant="secondary"
            size="sm"
            loading={signingOut}
            onPress={() => {
              setSigningOut(true);
              void signOut();
            }}
            style={styles.button}
          />
        )}
      </Card>

      <Card style={styles.card}>
        <Text variant="eyebrow">Wizards of the Coast</Text>
        <Text variant="body" tone="secondary">
          Spellbinder is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by
          Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
        </Text>
        <Button
          label="Fan Content Policy"
          variant="ghost"
          size="sm"
          onPress={() => void Linking.openURL(FAN_CONTENT_POLICY)}
          style={styles.button}
        />
      </Card>

      <Card style={styles.card}>
        <Text variant="eyebrow">Card data & images</Text>
        <Text variant="body" tone="secondary">
          Card data and images come from Scryfall. Spellbinder is not produced by or endorsed by Scryfall. Card
          images, mana symbols and card text are © Wizards of the Coast LLC; artists are credited wherever art is
          shown.
        </Text>
        <Button
          label="scryfall.com"
          variant="ghost"
          size="sm"
          onPress={() => void Linking.openURL(SCRYFALL)}
          style={styles.button}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: -spacing.sm,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xl,
  },
  card: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
});
