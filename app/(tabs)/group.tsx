import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { OracleButton } from '@/components/navigation/OracleButton';
import { ScreenHeader } from '@/components/navigation/ScreenHeader';
import { GameNightCard } from '@/components/playgroup/GameNightCard';
import { LendingPanel } from '@/components/playgroup/LendingPanel';
import { LogGameSheet } from '@/components/playgroup/LogGameSheet';
import { MemberStrip } from '@/components/playgroup/MemberStrip';
import { WhoHasItPanel } from '@/components/playgroup/WhoHasItPanel';
import { WinsLeaderboard } from '@/components/playgroup/WinsLeaderboard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { useCardLookup, useMembersById } from '@/stores/hooks';
import { incomingRequests, leaderboard, rsvpOf } from '@/stores/selectors/playgroup';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { usePlaygroupStore } from '@/stores/usePlaygroupStore';
import { selectUserId, useSessionStore } from '@/stores/useSessionStore';
import { layout, spacing } from '@/theme';

type Segment = 'night' | 'lending' | 'who';

const toSegment = (value: string | undefined): Segment =>
  value === 'lending' || value === 'who' ? value : 'night';

export default function GroupScreen() {
  // Home links here with ?segment=who; follow the param whenever it changes.
  const { segment: param } = useLocalSearchParams<{ segment?: string }>();
  const [segment, setSegment] = useState<Segment>(toSegment(param));
  const [lastParam, setLastParam] = useState(param);
  if (param !== lastParam) {
    setLastParam(param);
    if (param) setSegment(toSegment(param));
  }

  const me = useSessionStore(selectUserId);
  const status = usePlaygroupStore((s) => s.status);
  const playgroup = usePlaygroupStore((s) => s.playgroup);
  const members = usePlaygroupStore((s) => s.members);
  const gameNight = usePlaygroupStore((s) => s.gameNight);
  const rsvps = usePlaygroupStore((s) => s.rsvps);
  const games = usePlaygroupStore((s) => s.games);
  const loans = usePlaygroupStore((s) => s.loans);
  const memberItems = usePlaygroupStore((s) => s.memberItems);
  const myItems = useCollectionStore((s) => s.items);
  const membersById = useMembersById();
  const cardOf = useCardLookup();
  const [logging, setLogging] = useState(false);

  const incoming = me ? incomingRequests(loans, me).length : 0;
  const segments = [
    { value: 'night', label: 'Game night' },
    { value: 'lending', label: incoming > 0 ? `Lending · ${incoming}` : 'Lending' },
    { value: 'who', label: 'Who has it' },
  ] as const;

  const invite = () => {
    if (!playgroup) return;
    void Share.share({
      message: `Join ${playgroup.name} on Spellbinder — invite code ${playgroup.inviteCode}`,
    });
  };

  const header = (
    <ScreenHeader
      eyebrow="Playgroup"
      title={playgroup?.name ?? 'Playgroup'}
      actions={
        <>
          <OracleButton />
          <IconButton icon="share" accessibilityLabel="Invite a friend" disabled={!playgroup} onPress={invite} />
        </>
      }
    />
  );

  if (status !== 'ready' || !me) {
    return (
      <Screen withTabBar>
        {header}
        <Text variant="body" tone="muted">
          {status === 'none'
            ? 'You’re not in a playgroup yet. Ask a friend for their invite code.'
            : status === 'error'
              ? 'Couldn’t load your playgroup.'
              : 'Loading your playgroup…'}
        </Text>
      </Screen>
    );
  }

  return (
    <>
      <Screen withTabBar>
        {header}
        <MemberStrip members={members} me={me} />
        <SegmentedControl
          options={segments}
          value={segment}
          onChange={setSegment}
          accessibilityLabel="Playgroup sections"
          style={styles.segments}
        />

        {segment === 'night' ? (
          <View style={styles.stack}>
            {gameNight ? (
              <GameNightCard
                gameNight={gameNight}
                rsvps={rsvps}
                memberCount={members.length}
                mine={rsvpOf(rsvps, me)}
                onRsvp={(choice) => void usePlaygroupStore.getState().rsvp(choice)}
              />
            ) : (
              <Card>
                <Text variant="body" tone="muted">
                  No game night planned yet.
                </Text>
              </Card>
            )}
            <View>
              <SectionHeader title="Wins this season" />
              <Card>
                <WinsLeaderboard rows={leaderboard(games, members)} games={games.length} />
                <Text variant="caption" tone="muted" style={styles.caption}>
                  {games.length} games played
                </Text>
              </Card>
            </View>
            <Button label="Log a game" icon="plus" variant="secondary" onPress={() => setLogging(true)} />
          </View>
        ) : null}

        {segment === 'lending' ? (
          <LendingPanel
            loans={loans}
            me={me}
            membersById={membersById}
            cardOf={cardOf}
            onRespond={(loanId, decision) => void usePlaygroupStore.getState().respondToLoan(loanId, decision)}
          />
        ) : null}

        {segment === 'who' ? (
          <WhoHasItPanel
            me={me}
            myItems={myItems}
            memberItems={memberItems}
            loans={loans}
            membersById={membersById}
            cardOf={cardOf}
            onAsk={(oracleId, ownerId) => usePlaygroupStore.getState().requestLoan(oracleId, ownerId)}
          />
        ) : null}
      </Screen>

      <LogGameSheet
        visible={logging}
        onClose={() => setLogging(false)}
        members={members}
        onLog={(winnerId) => usePlaygroupStore.getState().logGame(winnerId)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  segments: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  stack: {
    gap: layout.sectionGap,
  },
  caption: {
    marginTop: spacing.md,
  },
});
