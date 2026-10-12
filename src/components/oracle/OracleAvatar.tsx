import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, radii } from '@/theme';

/** The Oracle's sparkle tile (chat avatar and header mark). */
export function OracleAvatar({ size = 32 }: { size?: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: Math.min(radii.md, size / 3) }]}>
      <Icon name="sparkle" size={size * 0.56} color={colors.gold} filled />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoftBg,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
});
