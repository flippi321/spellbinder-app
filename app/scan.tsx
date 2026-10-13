import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrintingsSheet } from '@/components/card/PrintingsSheet';
import { DeckPickerSheet } from '@/components/decks/DeckPickerSheet';
import { CameraPlaceholder, type CameraBlocker } from '@/components/scan/CameraPlaceholder';
import { ScanSheet } from '@/components/scan/ScanSheet';
import { SessionTray } from '@/components/scan/SessionTray';
import { Shutter } from '@/components/scan/Shutter';
import { Viewfinder } from '@/components/scan/Viewfinder';
import { CardSearchSheet } from '@/components/search/CardSearchSheet';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { useDeckStore } from '@/stores/useDeckStore';
import { useScanStore } from '@/stores/useScanStore';
import { colors, layout, radii, spacing } from '@/theme';
import { getCardId } from '@/utils/cards';
import { shortDeckName } from '@/utils/format';

const IS_SIMULATOR = Platform.OS !== 'web' && !Device.isDevice;

export default function ScanScreen() {
  const { deckId } = useLocalSearchParams<{ deckId?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [torch, setTorch] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [choosingDestination, setChoosingDestination] = useState(false);
  const [changingPrinting, setChangingPrinting] = useState(false);

  const status = useScanStore((s) => s.status);
  const match = useScanStore((s) => s.match);
  const foil = useScanStore((s) => s.foil);
  const quantity = useScanStore((s) => s.quantity);
  const destination = useScanStore((s) => s.destination);
  const session = useScanStore((s) => s.session);
  const toast = useScanStore((s) => s.toast);
  const error = useScanStore((s) => s.error);
  const decks = useDeckStore((s) => s.decks);
  const items = useCollectionStore((s) => s.items);

  // "Scan into deck" opens the scanner aimed at that deck; leaving clears the session.
  useEffect(() => {
    if (deckId) useScanStore.getState().setDestination({ kind: 'deck', deckId });
  }, [deckId]);
  useEffect(() => () => useScanStore.getState().endSession(), []);

  let blocker: CameraBlocker | null = null;
  if (IS_SIMULATOR) blocker = { kind: 'simulator' };
  else if (!permission) blocker = { kind: 'loading' };
  else if (!permission.granted)
    blocker = permission.canAskAgain ? { kind: 'ask', request: () => void requestPermission() } : { kind: 'denied' };
  else if (cameraError) blocker = { kind: 'error', message: cameraError };
  const liveCamera = blocker === null;

  const deck = destination.kind === 'deck' ? decks.find((d) => d.id === destination.deckId) : undefined;
  const destinationLabel = deck ? shortDeckName(deck.name) : 'Binder';
  const matchOracle = match ? getCardId(match.card) : null;
  const owned = matchOracle
    ? items.filter((i) => i.cardId === matchOracle).reduce((sum, i) => sum + i.quantity, 0)
    : 0;
  const deckCount = matchOracle ? decks.filter((d) => d.cards.some((c) => c.cardId === matchOracle)).length : 0;
  const frameWidth = Math.min(width * 0.68, (height * 0.46) * layout.cardAspect);

  const shoot = async () => {
    if (useScanStore.getState().status === 'identifying') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    let uri: string | null = null;
    if (liveCamera && cameraReady && camera.current) {
      try {
        uri = (await camera.current.takePictureAsync({ quality: 0.5, shutterSound: false }))?.uri ?? null;
      } catch {
        uri = null; // Recognition still runs; the mock ignores the image.
      }
    }
    await useScanStore.getState().capture(uri);
  };

  const add = async () => {
    await useScanStore.getState().confirmAdd();
    if (!useScanStore.getState().error) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  };

  const done = () => (deckId && router.canGoBack() ? router.back() : router.dismissTo('/binder'));

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {liveCamera ? (
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          onCameraReady={() => setCameraReady(true)}
          onMountError={(event) => setCameraError(event.message)}
        />
      ) : null}

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton icon="close" variant="scrim" accessibilityLabel="Close scanner" onPress={() => router.back()} />
        <Pressable
          onPress={() => setChoosingDestination(true)}
          accessibilityRole="button"
          accessibilityLabel={`Add scans to ${destinationLabel}`}
          accessibilityHint="Choose your binder or a deck"
          style={({ pressed }) => [styles.destination, pressed && styles.pressed]}>
          <Text variant="label" tone="secondary">
            Add to:
          </Text>
          <Text variant="label" tone="goldSoft">
            {destinationLabel}
          </Text>
          <Icon name="chevron" direction="down" size={16} color={colors.goldSoftText} />
        </Pressable>
        <IconButton
          icon="flash"
          variant={torch ? 'active' : 'scrim'}
          filled={torch}
          selected={torch}
          disabled={!liveCamera}
          accessibilityLabel={torch ? 'Turn off flashlight' : 'Turn on flashlight'}
          onPress={() => setTorch((on) => !on)}
        />
      </View>

      <View style={styles.center}>
        <Viewfinder width={frameWidth} active={liveCamera && (status === 'scanning' || status === 'identifying')}>
          {blocker ? <CameraPlaceholder blocker={blocker} /> : null}
        </Viewfinder>
        <Text variant="label" tone="secondary" align="center" style={styles.hint}>
          {status === 'identifying' ? 'Reading the card…' : 'Fit the card inside the frame'}
        </Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <SessionTray session={session} />
        <View style={styles.controls}>
          <Button label="Type it" variant="ghost" onPress={() => setTyping(true)} style={styles.sideButton} />
          <Shutter onPress={() => void shoot()} busy={status === 'identifying'} />
          <Button label="Done" variant="ghost" onPress={done} style={styles.sideButton} />
        </View>
      </View>

      <Toast
        toast={toast}
        onHide={() => useScanStore.getState().dismissToast()}
        bottom={insets.bottom + 170}
      />

      <ScanSheet
        status={status}
        match={match}
        error={error}
        foil={foil}
        quantity={quantity}
        destinationLabel={destinationLabel}
        toBinder={destination.kind === 'binder'}
        owned={owned}
        deckCount={deckCount}
        onToggleFoil={() => useScanStore.getState().toggleFoil()}
        onQuantity={(next) => useScanStore.getState().setQuantity(next)}
        onChangePrinting={() => setChangingPrinting(true)}
        onRescan={() => useScanStore.getState().rescan()}
        onTypeIt={() => setTyping(true)}
        onAdd={() => void add()}
      />

      <CardSearchSheet
        visible={typing}
        onClose={() => setTyping(false)}
        title="Type it"
        hint="Search by name — handy for worn, foil-glare or foreign cards."
        onSelect={(card) => useScanStore.getState().selectCard(card)}
      />
      <DeckPickerSheet
        visible={choosingDestination}
        onClose={() => setChoosingDestination(false)}
        title="Add scans to"
        includeBinder
        selected={destination.kind === 'binder' ? 'binder' : { deckId: destination.deckId }}
        onSelect={(value) =>
          useScanStore
            .getState()
            .setDestination(value === 'binder' ? { kind: 'binder' } : { kind: 'deck', deckId: value.deckId })
        }
      />
      {match ? (
        <PrintingsSheet
          visible={changingPrinting}
          onClose={() => setChangingPrinting(false)}
          cardId={getCardId(match.card)}
          currentId={match.card.id}
          onPick={(card) => useScanStore.getState().selectCard(card, match.confidence)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgCamera,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
  },
  destination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.chip,
    backgroundColor: colors.scrim,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  pressed: {
    opacity: 0.8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: spacing.lg,
  },
  bottom: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
    backgroundColor: colors.scrim,
    paddingTop: spacing.md,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideButton: {
    minWidth: 88,
  },
});
