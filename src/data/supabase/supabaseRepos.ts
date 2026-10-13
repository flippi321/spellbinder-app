import type { PostgrestSingleResponse } from '@supabase/supabase-js';

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
import { getCardId, slimCard } from '@/utils/cards';
import { GAME_NIGHT_WINDOW_MS } from '@/utils/gameNight';

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
} from './mappers';

/**
 * Supabase mode (EXPO_PUBLIC_DATA_MODE=supabase). Tables and RLS policies live in
 * the spellbinder-db repo (supabase/migrations): you edit only your own rows; playgroup peers can read.
 */

/**
 * Throws on PostgREST errors; otherwise returns the data, typed from the generated schema (`src/types/database.ts`).
 * `.maybeSingle()` queries keep their `| null`.
 */
function check<T>(result: PostgrestSingleResponse<T>): T {
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
      return row ? toProfile(row) : null;
    },
    async signIn(email, password) {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) throw error;
      return repo.currentUser();
    },
    async signUp(email, password, displayName) {
      // `handle_new_user` reads display_name from the user metadata to create the profile.
      const { error } = await getSupabase().auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) throw error;
      return repo.currentUser();
    },
    async requestPasswordReset(email) {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email);
      if (error) throw error;
    },
    async resetPassword(email, code, newPassword) {
      const supabase = getSupabase();
      const verified = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
      if (verified.error) throw verified.error;
      const updated = await supabase.auth.updateUser({ password: newPassword });
      if (updated.error) throw updated.error;
      return repo.currentUser();
    },
    onAuthChange(listener) {
      const { data } = getSupabase().auth.onAuthStateChange((_event, session) => listener(session?.user.id ?? null));
      return () => data.subscription.unsubscribe();
    },
    async signOut() {
      await getSupabase().auth.signOut();
    },
  };
  return repo;
}

function createCardRepo(): CardRepo {
  /** Cards first: every version points at its card. */
  const save = async (cards: Card[]) => {
    if (cards.length === 0) return;
    const rows = cards.map((card) => fromCard(card, getCardId(card)));
    const cardRows = [...new Map(rows.map(({ card }) => [card.id, card])).values()];
    for (const part of chunk(cardRows)) {
      check(await getSupabase().from('cards').upsert(part, { onConflict: 'id' }));
    }
    for (const part of chunk(rows.map(({ version }) => version))) {
      check(await getSupabase().from('card_versions').upsert(part, { onConflict: 'id' }));
    }
  };

  /** Read from the shared card cache (versions joined to their card); fetch what's missing from Scryfall and cache it. */
  const lookup = async (
    column: 'id' | 'card_id',
    keys: string[],
    toIdentifier: (key: string) => CardIdentifier,
  ): Promise<Card[]> => {
    const found = new Map<string, Card>();
    for (const part of chunk(keys)) {
      const rows = check(await getSupabase().from('card_versions').select('*, card:cards(*)').in(column, part));
      for (const row of rows) found.set(row[column], toCard(row));
    }
    const missing = keys.filter((key) => !found.has(key));
    if (missing.length > 0) {
      const { cards } = await getCollection(missing.map(toIdentifier));
      const slim = cards.map(slimCard);
      await save(slim);
      for (const card of slim) found.set(column === 'id' ? card.id : getCardId(card), card);
    }
    return [...found.values()];
  };

  return {
    getByIds: (ids) => lookup('id', ids, (id) => ({ id })),
    getByCardIds: (cardIds) => lookup('card_id', cardIds, (oracle_id) => ({ oracle_id })),
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
    getPrintings: async (cardId) => (await getPrintings(cardId)).map(slimCard),
    save,
  };
}

/**
 * Card references are foreign keys, so a write must not name a card the shared cache lacks (one the device cached
 * before, say). Looking the ids up caches any that are missing.
 */
type EnsureCached = { versions(ids: string[]): Promise<unknown>; cards(ids: (string | null)[]): Promise<unknown> };

function createEnsureCached(cards: CardRepo): EnsureCached {
  return {
    versions: (ids) => cards.getByIds(ids),
    cards: (ids) => {
      const known = ids.filter((id): id is string => !!id);
      return known.length > 0 ? cards.getByCardIds(known) : Promise.resolve();
    },
  };
}

function createCollectionRepo(ensure: EnsureCached): CollectionRepo {
  return {
    async list(userId) {
      const rows = check(await getSupabase().from('collection_items').select('*').eq('user_id', userId));
      return rows.map(toCollectionItem);
    },
    async upsert(item) {
      await ensure.versions([item.versionId]);
      const row = check(
        await getSupabase().from('collection_items').upsert(fromCollectionItem(item)).select().single(),
      );
      return toCollectionItem(row);
    },
    async remove(itemId) {
      check(await getSupabase().from('collection_items').delete().eq('id', itemId));
    },
  };
}

function createDeckRepo(ensure: EnsureCached): DeckRepo {
  return {
    async list(ownerId) {
      const rows = check(
        await getSupabase()
          .from('decks')
          .select('*, deck_cards(*)')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: true }),
      );
      return rows.map(toDeck);
    },
    async create(input) {
      const supabase = getSupabase();
      await ensure.cards([input.commanderCardId, ...input.cards.map((card) => card.cardId)]);
      const row = check(
        await supabase
          .from('decks')
          .insert({
            owner_id: input.ownerId,
            name: input.name,
            commander_card_id: input.commanderCardId,
            theme: input.theme,
            bracket: input.bracket,
          })
          .select()
          .single(),
      );
      if (input.cards.length > 0) {
        check(await supabase.from('deck_cards').insert(input.cards.map((card) => fromDeckCard(row.id, card))));
      }
      const deck: Deck = toDeck({ ...row, deck_cards: [] });
      return { ...deck, cards: input.cards };
    },
    async upsertCard(deckId, card) {
      await ensure.cards([card.cardId]);
      check(
        await getSupabase().from('deck_cards').upsert(fromDeckCard(deckId, card), { onConflict: 'deck_id,card_id' }),
      );
    },
    async removeCard(deckId, cardId) {
      check(await getSupabase().from('deck_cards').delete().eq('deck_id', deckId).eq('card_id', cardId));
    },
  };
}

function createPlaygroupRepo(ensure: EnsureCached): PlaygroupRepo {
  return {
    async load(userId) {
      const supabase = getSupabase();
      const membership = check(
        await supabase.from('playgroup_members').select('playgroup_id').eq('user_id', userId).limit(1).maybeSingle(),
      );
      if (!membership) return null;
      const playgroupId = membership.playgroup_id;

      const [playgroup, memberRows, nights, games, loans] = await Promise.all([
        supabase.from('playgroups').select('*').eq('id', playgroupId).single(),
        supabase.from('playgroup_members').select('profiles(*)').eq('playgroup_id', playgroupId),
        supabase
          .from('game_nights')
          .select('*, rsvps(*)')
          .eq('playgroup_id', playgroupId)
          // Include tonight's game night until 12 h after it starts, so games logged during it attach to it.
          .gte('starts_at', new Date(Date.now() - GAME_NIGHT_WINDOW_MS).toISOString())
          .order('starts_at', { ascending: true })
          .limit(1),
        supabase.from('games').select('*').eq('playgroup_id', playgroupId).order('played_at', { ascending: true }),
        supabase
          .from('loan_requests')
          .select('*')
          .or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
          .order('created_at', { ascending: false }),
      ]);

      const members = check(memberRows).map((m) => toProfile(m.profiles));
      const nightRows = check(nights);
      const next = nightRows[0] ?? null;

      const otherIds = members.map((m) => m.id).filter((id) => id !== userId);
      const memberItems =
        otherIds.length === 0
          ? []
          : check(await supabase.from('collection_items').select('*').in('user_id', otherIds));

      return {
        playgroup: toPlaygroup(check(playgroup)),
        members,
        nextGameNight: next ? toGameNight(next) : null,
        rsvps: next ? next.rsvps.map(toRsvp) : [],
        games: check(games).map(toGame),
        loans: check(loans).map(toLoan),
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
      await ensure.cards([request.cardId]);
      const row = check(
        await getSupabase()
          .from('loan_requests')
          .insert({
            card_id: request.cardId,
            requester_id: request.requesterId,
            owner_id: request.ownerId,
            note: request.note,
          })
          .select()
          .single(),
      );
      return toLoan(row);
    },
    async logGame(game) {
      await ensure.cards([game.winnerCommanderCardId]);
      const row = check(
        await getSupabase()
          .from('games')
          .insert({
            playgroup_id: game.playgroupId,
            played_at: game.playedAt,
            winner_id: game.winnerId,
            winner_commander_card_id: game.winnerCommanderCardId,
            game_night_id: game.gameNightId,
            player_count: game.playerCount,
            duration_minutes: game.durationMinutes,
          })
          .select()
          .single(),
      );
      return toGame(row);
    },
  };
}

export function createSupabaseRepos(): Repos {
  const cards = createCardRepo();
  const ensure = createEnsureCached(cards);
  return {
    session: createSessionRepo(),
    cards,
    collection: createCollectionRepo(ensure),
    decks: createDeckRepo(ensure),
    playgroup: createPlaygroupRepo(ensure),
  };
}
