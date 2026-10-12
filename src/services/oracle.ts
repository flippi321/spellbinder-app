import { config } from '@/config';
import type { OracleAnswer, OracleContext } from '@/types';

import { cannedAnswerFor } from './oracleAnswers';
import { getSupabase } from './supabase';

/**
 * The Oracle adapter. The app never talks to the Claude API directly: the real
 * implementation calls the Supabase Edge Function `oracle`, which holds the API key in
 * Supabase secrets and builds structured deck/collection context server-side.
 */
export interface OracleAdapter {
  ask(question: string, context?: OracleContext): Promise<OracleAnswer>;
}

const think = (ms: number) =>
  process.env.NODE_ENV === 'test' ? Promise.resolve() : new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Preview: canned answers to the three suggestions, a fallback for anything else. */
export const mockOracle: OracleAdapter = {
  async ask(question) {
    await think(1000);
    return cannedAnswerFor(question);
  },
};

/** Real Oracle via supabase/functions/oracle (stub server-side for now). */
export const edgeOracle: OracleAdapter = {
  async ask(question, context) {
    const { data, error } = await getSupabase().functions.invoke<{ answer: OracleAnswer }>('oracle', {
      body: { question, context },
    });
    if (error) throw error;
    if (!data?.answer) throw new Error('The Oracle returned an empty answer.');
    return data.answer;
  },
};

export function askOracle(question: string, context?: OracleContext): Promise<OracleAnswer> {
  return (config.oracleMode === 'edge' ? edgeOracle : mockOracle).ask(question, context);
}
