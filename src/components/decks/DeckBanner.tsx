import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { CardImage } from '@/components/ui/CardImage';
import { useCardByCardId } from '@/stores/useCardStore';
import { bannerTint } from '@/theme';
import type { Deck } from '@/types';

interface DeckBannerProps {
  deck: Deck;
  height: number;
  /** Show the commander's art crop (with artist credit). Off = tint only. */
  showArt?: boolean;
  radius?: number;
  /** Overlay content (pips, chips). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Deck header art. The color-identity tint is the background/placeholder only — the art
 * itself is never tinted or color-shifted (Scryfall image guidelines).
 */
export function DeckBanner({ deck, height, showArt = false, radius = 0, children, style }: DeckBannerProps) {
  const commander = useCardByCardId(deck.commanderCardId);
  return (
    <View
      style={[
        styles.banner,
        { height, borderRadius: radius, backgroundColor: bannerTint(commander?.color_identity ?? []) },
        style,
      ]}>
      {showArt && commander ? (
        <CardImage card={commander} variant="art" showCredit style={StyleSheet.absoluteFill} />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    overflow: 'hidden',
  },
});
