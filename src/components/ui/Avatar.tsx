import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Profile } from '@/types';
import { avatarColors, colors, layout, typography } from '@/theme';

import { Text } from './Text';

type AvatarProfile = Pick<Profile, 'displayName' | 'initials' | 'avatarColor'>;

interface AvatarProps {
  profile: AvatarProfile;
  size?: number;
  /** Gold ring, e.g. for the signed-in user or a selected member. */
  ring?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ profile, size = 40, ring = false, onPress, accessibilityHint, style }: AvatarProps) {
  const palette = avatarColors[profile.avatarColor];
  const circle = (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.bg,
          borderColor: ring ? colors.gold : colors.border,
          borderWidth: ring ? 2 : 1,
        },
        !onPress && style,
      ]}
      accessible={!onPress}
      accessibilityLabel={profile.displayName}>
      <Text
        style={[styles.initials, { color: palette.ink, fontSize: Math.round(size * 0.36) }]}
        allowFontScaling={false}>
        {profile.initials}
      </Text>
    </View>
  );

  if (!onPress) return circle;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={Math.max(0, (layout.minTouch - size) / 2)}
      accessibilityRole="button"
      accessibilityLabel={profile.displayName}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [pressed && styles.pressed, style]}>
      {circle}
    </Pressable>
  );
}

/** Overlapping avatars, e.g. "Jonas, Mira and Erik own it too". */
export function AvatarStack({ profiles, size = 28 }: { profiles: AvatarProfile[]; size?: number }) {
  return (
    <View style={styles.stack} accessible accessibilityLabel={profiles.map((p) => p.displayName).join(', ')}>
      {profiles.map((profile, index) => (
        <View
          key={profile.initials + index}
          style={[styles.stackItem, { marginLeft: index === 0 ? 0 : -size * 0.3, borderRadius: size }]}>
          <Avatar profile={profile} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: typography.eyebrow.fontFamily,
    includeFontPadding: false,
  },
  pressed: {
    opacity: 0.8,
  },
  stack: {
    flexDirection: 'row',
  },
  stackItem: {
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
