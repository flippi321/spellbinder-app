import { create } from 'zustand';

import { getRepos } from '@/data';
import type { CollectionItem, Game, GameNight, LoanRequest, Playgroup, Profile, Rsvp, RsvpStatus } from '@/types';
import { messageOf } from '@/utils/errors';

import { useCardStore } from './useCardStore';
import { useSessionStore } from './useSessionStore';

interface PlaygroupState {
  status: 'idle' | 'loading' | 'ready' | 'none' | 'error';
  error: string | null;
  playgroup: Playgroup | null;
  members: Profile[];
  gameNight: GameNight | null;
  rsvps: Rsvp[];
  games: Game[];
  loans: LoanRequest[];
  /** Other members' collections. */
  memberItems: CollectionItem[];
  load(userId: string): Promise<void>;
  rsvp(status: RsvpStatus): Promise<void>;
  respondToLoan(loanId: string, decision: 'lent' | 'declined'): Promise<void>;
  requestLoan(oracleId: string, ownerId: string, note?: string): Promise<void>;
  logGame(winnerId: string): Promise<void>;
}

const me = () => {
  const id = useSessionStore.getState().user?.id;
  if (!id) throw new Error('Sign in to use the playgroup.');
  return id;
};

export const usePlaygroupStore = create<PlaygroupState>()((set, get) => {
  const writeThrough = async (task: () => Promise<unknown>) => {
    try {
      await task();
    } catch (error) {
      set({ error: messageOf(error) });
    }
  };

  return {
    status: 'idle',
    error: null,
    playgroup: null,
    members: [],
    gameNight: null,
    rsvps: [],
    games: [],
    loans: [],
    memberItems: [],

    async load(userId) {
      set({ status: 'loading', error: null });
      try {
        const snapshot = await getRepos().playgroup.load(userId);
        if (!snapshot) {
          set({ status: 'none' });
          return;
        }
        set({
          status: 'ready',
          playgroup: snapshot.playgroup,
          members: snapshot.members,
          gameNight: snapshot.nextGameNight,
          rsvps: snapshot.rsvps,
          games: snapshot.games,
          loans: snapshot.loans,
          memberItems: snapshot.memberItems,
        });
        const cards = useCardStore.getState();
        await Promise.all([
          cards.ensureIds(snapshot.memberItems.map((item) => item.scryfallId)),
          cards.ensureOracleIds(snapshot.loans.map((loan) => loan.cardOracleId)),
        ]).catch(() => undefined);
      } catch (error) {
        set({ status: 'error', error: messageOf(error) });
      }
    },

    async rsvp(status) {
      const night = get().gameNight;
      if (!night) return;
      const rsvp: Rsvp = { gameNightId: night.id, userId: me(), status };
      set((state) => ({
        rsvps: [...state.rsvps.filter((r) => r.userId !== rsvp.userId), rsvp],
      }));
      await writeThrough(() => getRepos().playgroup.setRsvp(rsvp));
    },

    async respondToLoan(loanId, decision) {
      set((state) => ({
        loans: state.loans.map((loan) => (loan.id === loanId ? { ...loan, status: decision } : loan)),
      }));
      await writeThrough(() => getRepos().playgroup.updateLoan(loanId, decision));
    },

    async requestLoan(oracleId, ownerId, note) {
      const loan = await getRepos().playgroup.requestLoan({
        cardOracleId: oracleId,
        requesterId: me(),
        ownerId,
        note: note ?? null,
      });
      set((state) => ({ loans: [loan, ...state.loans] }));
    },

    async logGame(winnerId) {
      const playgroup = get().playgroup;
      if (!playgroup) return;
      const game = await getRepos().playgroup.logGame({
        playgroupId: playgroup.id,
        playedAt: new Date().toISOString(),
        winnerId,
        winnerCommanderOracleId: null,
        playerCount: Math.max(2, get().members.length),
        durationMinutes: null,
      });
      set((state) => ({ games: [...state.games, game] }));
    },
  };
});
