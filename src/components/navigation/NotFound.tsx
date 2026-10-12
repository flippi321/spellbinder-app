import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Sigil } from '@/components/ui/Sigil';
import { Text } from '@/components/ui/Text';
import { colors, layout, spacing } from '@/theme';

/** Shown when a route's id doesn't resolve (deleted deck, stale link). */
export function NotFound({ title, message }: { title: string; message: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.xxxl }]}>
      <Sigil size={48} />
      <Text variant="title" align="center">
        {title}
      </Text>
      <Text variant="body" tone="muted" align="center">
        {message}
      </Text>
      <Button label="Go home" variant="secondary" onPress={() => router.dismissTo('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: layout.screenPadding,
    backgroundColor: colors.bg,
  },
});
