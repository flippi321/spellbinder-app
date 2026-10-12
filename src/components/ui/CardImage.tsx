import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Card } from '@/types';
import type { ImageSize } from '@/types/scryfall';
import { colors, identityTint, layout, radii, spacing } from '@/theme';
import { getArtist, getImageUri } from '@/utils/cards';

import { Text } from './Text';

export interface CardImageProps {
  card?: Card | null;
  /** Used for the placeholder when the card isn't loaded yet. */
  name?: string;
  /** Tints the placeholder when there's no card object (e.g. offline). */
  identity?: readonly string[];
  /** `card`: full card at 63:88, never cropped. `art`: Scryfall art_crop, fills its frame. */
  variant?: 'card' | 'art';
  size?: Exclude<ImageSize, 'art_crop'>;
  face?: number;
  /** Scryfall requires the artist + copyright wherever an art_crop is shown. */
  showCredit?: boolean;
  showPlaceholderLabel?: boolean;
  radius?: number;
  priority?: 'low' | 'normal' | 'high';
  style?: StyleProp<ViewStyle>;
}

/**
 * A Scryfall card image (or art crop) with a color-identity-tinted placeholder.
 * Full card images use `contain` so nothing — artist line, copyright — is ever cropped.
 */
export function CardImage({
  card,
  name,
  identity,
  variant = 'card',
  size = 'normal',
  face = 0,
  showCredit = false,
  showPlaceholderLabel = variant === 'card',
  radius = variant === 'card' ? radii.sm : 0,
  priority,
  style,
}: CardImageProps) {
  const [failedUri, setFailedUri] = useState<string | undefined>();
  const candidate = getImageUri(card, variant === 'art' ? 'art_crop' : size, face);
  const uri = candidate && candidate !== failedUri ? candidate : undefined;
  const label = card?.name ?? name ?? 'Card';
  const artist = card ? getArtist(card, face) : undefined;

  return (
    <View
      style={[
        styles.frame,
        variant === 'card' && styles.cardRatio,
        { backgroundColor: identityTint(card?.color_identity ?? identity ?? []), borderRadius: radius },
        style,
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={variant === 'art' ? `Art from ${label}` : label}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit={variant === 'art' ? 'cover' : 'contain'}
          transition={150}
          cachePolicy="memory-disk"
          recyclingKey={uri}
          priority={priority}
          onError={() => setFailedUri(uri)}
        />
      ) : showPlaceholderLabel ? (
        <View style={styles.placeholder}>
          <Text variant="heading" tone="tertiary" align="center" numberOfLines={4}>
            {label}
          </Text>
        </View>
      ) : null}
      {showCredit && uri && artist ? <ArtCredit artist={artist} /> : null}
    </View>
  );
}

/** "Artist · © WotC" chip shown on art crops (Scryfall image guidelines). */
export function ArtCredit({ artist, style }: { artist: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[styles.credit, style]}
      accessible
      accessibilityLabel={`Illustration by ${artist}. Copyright Wizards of the Coast.`}>
      <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.creditText}>
        {artist} · © WotC
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  cardRatio: {
    aspectRatio: layout.cardAspect,
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  credit: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    maxWidth: '80%',
    backgroundColor: colors.scrim,
    borderRadius: radii.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  creditText: {
    fontSize: 10,
    lineHeight: 13,
  },
});
