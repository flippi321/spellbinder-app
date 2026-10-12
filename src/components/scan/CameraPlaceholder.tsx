import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

export type CameraBlocker =
  | { kind: 'loading' }
  | { kind: 'simulator' }
  | { kind: 'ask'; request: () => void }
  | { kind: 'denied' }
  | { kind: 'error'; message: string };

const COPY: Record<CameraBlocker['kind'], { title: string; body: string }> = {
  loading: { title: 'Starting camera…', body: '' },
  simulator: {
    title: 'No camera in the simulator',
    body: 'Tap the shutter to simulate a scan, or type a card name.',
  },
  ask: {
    title: 'Scan cards with your camera',
    body: 'Spellbinder only uses the camera while this screen is open.',
  },
  denied: {
    title: 'Camera access is off',
    body: 'Turn it on in Settings — or tap the shutter to simulate a scan.',
  },
  error: {
    title: 'The camera didn’t start',
    body: 'Tap the shutter to simulate a scan, or type a card name.',
  },
};

/** Shown inside the viewfinder when the live camera isn't available. */
export function CameraPlaceholder({ blocker }: { blocker: CameraBlocker }) {
  const copy = COPY[blocker.kind];
  return (
    <View style={styles.box}>
      <Icon name="scan" size={36} color={colors.gold} />
      <Text variant="heading" align="center">
        {copy.title}
      </Text>
      {copy.body ? (
        <Text variant="caption" tone="secondary" align="center">
          {blocker.kind === 'error' ? `${blocker.message}. ${copy.body}` : copy.body}
        </Text>
      ) : null}
      {blocker.kind === 'ask' ? <Button label="Allow camera" size="sm" onPress={blocker.request} /> : null}
      {blocker.kind === 'denied' ? (
        <Button label="Open Settings" size="sm" variant="secondary" onPress={() => void Linking.openSettings()} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});
