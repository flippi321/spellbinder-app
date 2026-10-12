import { create } from 'zustand';

import { askOracle } from '@/services/oracle';
import type { OracleMessage } from '@/types';
import { messageOf } from '@/utils/errors';
import { createId } from '@/utils/id';

import { useDeckStore } from './useDeckStore';
import { useSessionStore } from './useSessionStore';

interface OracleState {
  messages: OracleMessage[];
  busy: boolean;
  ask(question: string): Promise<void>;
  /** New chat. */
  reset(): void;
}

/** Bumped on reset so a late answer never lands in a fresh chat. */
let conversation = 0;

export const useOracleStore = create<OracleState>()((set, get) => ({
  messages: [],
  busy: false,

  async ask(rawQuestion) {
    const question = rawQuestion.trim();
    if (!question || get().busy) return;
    const thread = conversation;
    set((state) => ({
      busy: true,
      messages: [...state.messages, { id: createId(), role: 'user', text: question, createdAt: new Date().toISOString() }],
    }));

    const context = {
      userId: useSessionStore.getState().user?.id ?? '',
      deckIds: useDeckStore.getState().decks.map((deck) => deck.id),
    };
    let answer;
    try {
      answer = await askOracle(question, context);
    } catch (error) {
      answer = { intro: `The Oracle couldn’t answer right now: ${messageOf(error)}`, sections: [] };
    }
    if (thread !== conversation) return;
    set((state) => ({
      busy: false,
      messages: [...state.messages, { id: createId(), role: 'oracle', answer, createdAt: new Date().toISOString() }],
    }));
  },

  reset() {
    conversation += 1;
    set({ messages: [], busy: false });
  },
}));
