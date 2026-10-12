import { router } from 'expo-router';

import { IconButton } from '@/components/ui/IconButton';

/** Gold sparkle in the top-right of every main screen; opens the Oracle. */
export function OracleButton({ variant = 'oracle' }: { variant?: 'oracle' | 'scrim' }) {
  return (
    <IconButton
      icon="sparkle"
      variant={variant}
      iconSize={20}
      accessibilityLabel="Ask the Oracle"
      accessibilityHint="Opens the AI deck advisor"
      onPress={() => router.push('/oracle')}
    />
  );
}
