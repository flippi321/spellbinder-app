import type { PostgrestError } from '@supabase/supabase-js';

import {
  autocomplete,
  getCollection,
  getNamedExact,
  getNamedFuzzy,
  getPrintings,
  ScryfallError,
} from '@/services/scryfall';
import { getSupabase } from '@/services/supabase';
import type { Card, Deck } from '@/types';
import type { CardIdentifier } from '@/types/scryfall';
import { getOracleId, slimCard } from '@/utils/cards';

import type {
  CardRepo,
  CollectionRepo,
  DeckRepo,
  PlaygroupRepo,
  Repos,
  SessionRepo,
} from '../repositories';
import {
  fromCard,
  fromCollectionItem,
  fromDeckCard,
  fromRsvp,
  toCard,
  toCollectionItem,
  toDeck,
  toGame,
  toGameNight,
  toLoan,
  toPlaygroup,
  toProfile,
  toRsvp,
  type CardRow,
  type CollectionItemRow,
  type DeckRow,
  type GameNightRow,
  type GameRow,
  type LoanRequestRow,
  type PlaygroupRow,
  type ProfileRow,
  type RsvpRow,
} from './mappers';

/**
 * Supabase mode (EXPO_PUBLIC_DATA_MODE=supabase). Tables and RLS policies live in
 * supabase/migrations/0001_init.sql: you edit only your own rows; playgroup peers can read.
 */

/** Throws on PostgREST errors. Rows are untyped until generated types exist, so callers cast. */
function check(result: { data: unknown; error: PostgrestError | null }): unknown {
  if (result.error) throw new Error(`Supabase: ${result.error.message}`);
  return result.data;
}

/** PostgREST puts `in (...)` filters in the URL, so keep lists short. */
function chunk<T>(items: readonly T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function createSessionRepo(): SessionRepo {
  const repo: SessionRepo = {
    async currentUser() {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      if (!data.session) return null;
      const row = check(await supabase.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle());
      return row ? toProfile(row as ProfileRow) : null;
    },
    async signInWithOtp(email) {
      const { error } = await getSupabase().auth.signInWithOtp({ email });
      if (error) throw error;
    },
    async verifyOtp(email, code) {
      const { error } = await getSupabase().auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) throw error;
      return repo.currentUser();
    },
    async signOut() {
      await getSupabase().auth.signOut();
    },
  };
  return repo;
}

function createCardRepo(): CardRepo {
  const save = async (cards: Card[]) => {
    if (cards.length === 0) return;
    const rows = cards.map((card) => fromCard(card, getOracleId(card)));
    for (const part of chunk(rows)) {
      check(await getSupabase().from('cards').upsert(part, { onConflict: 'scryfall_id' }));
    }
  };

  /** Read from the shared `cards` cache; fetch what's missing from Scryfall and cache it. */
  const lookup = async (
    column: 'scryfall_id' | 'oracle_id',
    keys: string[],
    toIdentifier: (key: string) => CardIdentifier,
  ): Promise<Card[]> => {
    const found = new Map<string, Card>();
    for (const part of chunk(keys)) {
      const rows = check(await getSupabase().from('cards').select('*').in(column, part)) as CardRow[];
      for (const row of rows) found.set(row[column], toCard(row));
    }
    const missing = keys.filter((key) => !found.has(key));
    if (missing.length > 0) {
      const { cards } = await getCollection(missing.map(toIdentifier));
      const slim = cards.map(slimCard);
      await save(slim);
      for (const card of slim) found.set(column === 'scryfall_id' ? card.id : getOracleId(card), card);
    }
    return [...found.values()];
  };

  return {
    getByIds: (ids) => lookup('scryfall_id', ids, (id) => ({ id })),
    getByOracleIds: (oracleIds) => lookup('oracle_id', oracleIds, (oracle_id) => ({ oracle_id })),
    async findByName(name, { fuzzy = false } = {}) {
      try {
        const card = slimCard(await (fuzzy ? getNamedFuzzy(name) : getNamedExact(name)));
        await save([card]);
        return card;
      } catch (error) {
        if (error instanceof ScryfallError && error.status === 404) return null;
        throw error;
      }
    },
    autocomplete: (query) => autocomplete(query),
    getPrintings: async (oracleId) => (await getPrintings(oracleId)).map(slimCard),
    save,
  };
}

function createCollectionRepo(): CollectionRepo {
  return {
    async list(userId) {
      const rows = check(await getSupabase().from('collection_items').select('*').eq('user_id', userId));
      return (rows as CollectionItemRow[]).map(toCollectionItem);
    },
    async upsert(item) {
      const row = check(
        await getSupabase().from('collection_items').upsert(fromCollectionItem(item)).select().single(),
      );
      return toCollectionItem(row as CollectionItemRow);
    },
    async remove(itemId) {
      check(await getSupabase().from('collection_items').delete().eq('id', itemId));
    },
  };
}

function createDeckRepo(): DeckRepo {
  return {
    async list(ownerId) {
      const rows = check(
        await getSupabase()
          .from('decks')
          .select('*, deck_cards(*)')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: true }),
      );
      return (rows as DeckRow[]).map(toDeck);
    },
    async create(input) {
      const supabase = getSupabase();
      const row = check(
        await supabase
          .from('decks')
          .insert({
            owner_id: input.ownerId,
            name: input.name,
            commander_oracle_id: input.commanderOracleId,
            theme: input.theme,
            bracket: input.bracket,
          })
          .select()
          .single(),
      ) as DeckRow;
      if (input.cards.length > 0) {
        check(await supabase.from('deck_cards').insert(input.cards.map((card) => fromDeckCard(row.id, card))));
      }
      const deck: Deck = toDeck({ ...row, deck_cards: [] });
      return { ...deck, cards: input.cards };
    },
    async upsertCard(deckId, card) {
      check(
        await getSupabase().from('deck_cards').upsert(fromDeckCard(deckId, card), { onConflict: 'deck_id,oracle_id' }),
      );
    },
    async removeCard(deckId, oracleId) {
      check(await getSupabase().from('deck_cards').delete().eq('deck_id', deckId).eq('oracle_id', oracleId));
    },
  };
}

function createPlaygroupRepo(): PlaygroupRepo {
  return {
    async load(userId) {
      const supabase = getSupabase();
      const membership = check(
        await supabase.from('playgroup_members').select('playgroup_id').eq('user_id', userId).limit(1).maybeSingle(),
      ) as { playgroup_id: string } | null;
      if (!membership) return null;
      const playgroupId = membership.playgroup_id;

      const [playgroup, memberRows, nights, games, loans] = await Promise.all([
        supabase.from('playgroups').select('*').eq('id', playgroupId).single(),
        supabase.from('playgroup_members').select('profiles(*)').eq('playgroup_id', playgroupId),
        supabase
          .from('game_nights')
          .select('*, rsvps(*)')
          .eq('playgroup_id', playgroupId)
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(1),
        supabase.from('games').select('*').eq('playgroup_id', playgroupId).order('played_at', { ascending: true }),
        supabase
          .from('loan_requests')
          .select('*')
          .or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
          .order('created_at', { ascending: false }),
      ]);

      const members = (check(memberRows) as unknown as { profiles: ProfileRow }[]).map((m) => toProfile(m.profiles));
      const nightRows = check(nights) as (GameNightRow & { rsvps: RsvpRow[] })[];
      const next = nightRows[0] ?? null;

      const otherIds = members.map((m) => m.id).filter((id) => id !== userId);
      const memberItems =
        otherIds.length === 0
          ? []
          : (check(await supabase.from('collection_items').select('*').in('user_id', otherIds)) as CollectionItemRow[]);

      return {
        playgroup: toPlaygroup(check(playgroup) as PlaygroupRow),
        members,
        nextGameNight: next ? toGameNight(next) : null,
        rsvps: next ? next.rsvps.map(toRsvp) : [],
        games: (check(games) as GameRow[]).map(toGame),
        loans: (check(loans) as LoanRequestRow[]).map(toLoan),
        memberItems: memberItems.map(toCollectionItem),
      };
    },
    async setRsvp(rsvp) {
      check(await getSupabase().from('rsvps').upsert(fromRsvp(rsvp), { onConflict: 'game_night_id,user_id' }));
    },
    async updateLoan(loanId, status) {
      check(await getSupabase().from('loan_requests').update({ status }).eq('id', loanId));
    },
    async requestLoan(request) {
      const row = check(
        await getSupabase()
          .from('loan_requests')
          .insert({
            card_oracle_id: request.cardOracleId,
            requester_id: request.requesterId,
            owner_id: request.ownerId,
            note: request.note,
          })
          .select()
          .single(),
      );
      return toLoan(row as LoanRequestRow);
    },
    async logGame(game) {
      const row = check(
        await getSupabase()
          .from('games')
          .insert({
            playgroup_id: game.playgroupId,
            played_at: game.playedAt,
            winner_id: game.winnerId,
            winner_commander_oracle_id: game.winnerCommanderOracleId,
            player_count: game.playerCount,
            duration_minutes: game.durationMinutes,
          })
          .select()
          .single(),
      );
      return toGame(row as GameRow);
    },
  };
}

export function createSupabaseRepos(): Repos {
  return {
    session: createSessionRepo(),
    cards: createCardRepo(),
    collection: createCollectionRepo(),
    decks: createDeckRepo(),
    playgroup: createPlaygroupRepo(),
  };
}
