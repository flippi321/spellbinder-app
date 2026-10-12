-- Spellbinder — initial schema (docs/VISION.md §6). NOT applied anywhere yet.
-- Review, then apply with the Supabase CLI: `supabase link` → `supabase db push`.
--
-- Access rules (Row Level Security):
--   * You read and write only your own collection and decks.
--   * Members of the same playgroup can READ each other's profiles, collections and decks.
--   * Loan requests are visible to their requester and owner only.
--   * Game nights, RSVPs and games are visible to the playgroup's members.
--   * `cards` is a shared Scryfall cache any signed-in user can read and upsert.

create extension if not exists pgcrypto with schema extensions;

-- ── Profiles ───────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 40),
  initials      text not null check (char_length(initials) between 1 and 3),
  avatar_color  text not null default 'gold' check (avatar_color in ('gold', 'blue', 'green', 'red', 'violet')),
  created_at    timestamptz not null default now()
);

-- ── Playgroups ─────────────────────────────────────────────────────────────────────────────
create table public.playgroups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 60),
  invite_code  text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_by   uuid not null references public.profiles (id) on delete restrict,
  created_at   timestamptz not null default now()
);

create table public.playgroup_members (
  playgroup_id  uuid not null references public.playgroups (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  role          text not null default 'member' check (role in ('owner', 'member')),
  joined_at     timestamptz not null default now(),
  primary key (playgroup_id, user_id)
);
create index playgroup_members_user_idx on public.playgroup_members (user_id);

-- ── Cards: slim Scryfall cache (never store images — only Scryfall URLs) ──────────────────
create table public.cards (
  scryfall_id       uuid primary key,
  oracle_id         uuid not null,
  name              text not null,
  layout            text not null default 'normal',
  mana_cost         text,
  cmc               numeric not null default 0,
  type_line         text not null,
  oracle_text       text,
  power             text,
  toughness         text,
  loyalty           text,
  colors            text[],
  color_identity    text[] not null default '{}',
  legalities        jsonb not null default '{}'::jsonb,
  image_uris        jsonb,
  card_faces        jsonb,
  set               text not null,
  collector_number  text not null,
  rarity            text not null default 'common',
  artist            text,
  updated_at        timestamptz not null default now()
);
create index cards_oracle_idx on public.cards (oracle_id);
create index cards_name_idx on public.cards (lower(name));

-- ── Collections (by Scryfall printing id; "Do I own this?" joins on oracle_id) ────────────
create table public.collection_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  scryfall_id  uuid not null references public.cards (scryfall_id),
  oracle_id    uuid not null,
  quantity     integer not null check (quantity > 0),
  foil         boolean not null default false,
  condition    text not null default 'NM' check (condition in ('NM', 'LP', 'MP', 'HP', 'DMG')),
  created_at   timestamptz not null default now(),
  unique (user_id, scryfall_id, foil, condition)
);
create index collection_items_user_idx on public.collection_items (user_id);
create index collection_items_oracle_idx on public.collection_items (oracle_id);

-- ── Decks (cards by oracle_id) ─────────────────────────────────────────────────────────────
create table public.decks (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name                 text not null check (char_length(name) between 1 and 80),
  commander_oracle_id  uuid not null,
  partner_oracle_id    uuid,
  theme                text,
  bracket              smallint not null default 2 check (bracket between 1 and 5),
  created_at           timestamptz not null default now()
);
create index decks_owner_idx on public.decks (owner_id);

create table public.deck_cards (
  deck_id       uuid not null references public.decks (id) on delete cascade,
  oracle_id     uuid not null,
  quantity      integer not null default 1 check (quantity > 0),
  category      text not null default 'Other',
  is_commander  boolean not null default false,
  primary key (deck_id, oracle_id)
);
create index deck_cards_oracle_idx on public.deck_cards (oracle_id);

-- ── Lending ────────────────────────────────────────────────────────────────────────────────
create table public.loan_requests (
  id              uuid primary key default gen_random_uuid(),
  card_oracle_id  uuid not null,
  requester_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending', 'lent', 'declined', 'returned')),
  note            text check (char_length(note) <= 280),
  created_at      timestamptz not null default now(),
  check (requester_id <> owner_id)
);
create index loan_requests_requester_idx on public.loan_requests (requester_id);
create index loan_requests_owner_idx on public.loan_requests (owner_id);

-- ── Game nights, RSVPs, games ──────────────────────────────────────────────────────────────
create table public.game_nights (
  id            uuid primary key default gen_random_uuid(),
  playgroup_id  uuid not null references public.playgroups (id) on delete cascade,
  starts_at     timestamptz not null,
  location      text,
  notes         text,
  created_by    uuid not null default auth.uid() references public.profiles (id),
  created_at    timestamptz not null default now()
);
create index game_nights_playgroup_idx on public.game_nights (playgroup_id, starts_at);

create table public.rsvps (
  game_night_id  uuid not null references public.game_nights (id) on delete cascade,
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status         text not null check (status in ('going', 'maybe', 'no')),
  updated_at     timestamptz not null default now(),
  primary key (game_night_id, user_id)
);

create table public.games (
  id                          uuid primary key default gen_random_uuid(),
  playgroup_id                uuid not null references public.playgroups (id) on delete cascade,
  played_at                   timestamptz not null default now(),
  winner_id                   uuid not null references public.profiles (id),
  winner_commander_oracle_id  uuid,
  player_count                smallint not null default 4 check (player_count between 2 and 10),
  duration_minutes            integer check (duration_minutes > 0),
  created_by                  uuid not null default auth.uid() references public.profiles (id)
);
create index games_playgroup_idx on public.games (playgroup_id, played_at);

-- ── Helpers (security definer so policies on playgroup_members don't recurse) ─────────────
create or replace function public.is_playgroup_member(group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.playgroup_members m
    where m.playgroup_id = group_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.shares_playgroup(other_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.playgroup_members mine
    join public.playgroup_members theirs on theirs.playgroup_id = mine.playgroup_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = other_user
  );
$$;

-- Creating a group also makes you its owner (one transaction).
create or replace function public.create_playgroup(group_name text)
returns public.playgroups
language plpgsql security definer set search_path = ''
as $$
declare
  created public.playgroups;
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in';
  end if;
  insert into public.playgroups (name, created_by) values (group_name, (select auth.uid())) returning * into created;
  insert into public.playgroup_members (playgroup_id, user_id, role) values (created.id, (select auth.uid()), 'owner');
  return created;
end;
$$;

-- Joining needs the invite code; members are never inserted directly by clients.
create or replace function public.join_playgroup(code text)
returns public.playgroups
language plpgsql security definer set search_path = ''
as $$
declare
  target public.playgroups;
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in';
  end if;
  select * into target from public.playgroups where invite_code = upper(trim(code));
  if not found then
    raise exception 'Invalid invite code';
  end if;
  insert into public.playgroup_members (playgroup_id, user_id) values (target.id, (select auth.uid()))
  on conflict do nothing;
  return target;
end;
$$;

revoke execute on function public.is_playgroup_member(uuid), public.shares_playgroup(uuid),
  public.create_playgroup(text), public.join_playgroup(text) from public, anon;
grant execute on function public.is_playgroup_member(uuid), public.shares_playgroup(uuid),
  public.create_playgroup(text), public.join_playgroup(text) to authenticated;

-- Every new auth user gets a profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  display text := left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Planeswalker'), 40);
begin
  insert into public.profiles (id, display_name, initials)
  values (new.id, display, upper(left(display, 2)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ─────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.playgroups enable row level security;
alter table public.playgroup_members enable row level security;
alter table public.cards enable row level security;
alter table public.collection_items enable row level security;
alter table public.decks enable row level security;
alter table public.deck_cards enable row level security;
alter table public.loan_requests enable row level security;
alter table public.game_nights enable row level security;
alter table public.rsvps enable row level security;
alter table public.games enable row level security;

-- profiles
create policy "profiles: read self and playgroup peers" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.shares_playgroup(id));
create policy "profiles: update self" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- playgroups (created via create_playgroup, joined via join_playgroup)
create policy "playgroups: members read" on public.playgroups
  for select to authenticated using (public.is_playgroup_member(id));
create policy "playgroups: owner updates" on public.playgroups
  for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

-- playgroup_members
create policy "members: read own groups" on public.playgroup_members
  for select to authenticated using (public.is_playgroup_member(playgroup_id));
create policy "members: leave" on public.playgroup_members
  for delete to authenticated using (user_id = (select auth.uid()));

-- cards (shared cache)
create policy "cards: read" on public.cards for select to authenticated using (true);
create policy "cards: insert" on public.cards for insert to authenticated with check (true);
create policy "cards: refresh" on public.cards for update to authenticated using (true) with check (true);

-- collection_items
create policy "collection: read own and peers" on public.collection_items
  for select to authenticated using (user_id = (select auth.uid()) or public.shares_playgroup(user_id));
create policy "collection: insert own" on public.collection_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "collection: update own" on public.collection_items
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "collection: delete own" on public.collection_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- decks
create policy "decks: read own and peers" on public.decks
  for select to authenticated using (owner_id = (select auth.uid()) or public.shares_playgroup(owner_id));
create policy "decks: insert own" on public.decks
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "decks: update own" on public.decks
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "decks: delete own" on public.decks
  for delete to authenticated using (owner_id = (select auth.uid()));

-- deck_cards follow their deck
create policy "deck_cards: read own and peers" on public.deck_cards
  for select to authenticated using (
    exists (
      select 1 from public.decks d
      where d.id = deck_id and (d.owner_id = (select auth.uid()) or public.shares_playgroup(d.owner_id))
    )
  );
create policy "deck_cards: write own" on public.deck_cards
  for all to authenticated
  using (exists (select 1 from public.decks d where d.id = deck_id and d.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.decks d where d.id = deck_id and d.owner_id = (select auth.uid())));

-- loan_requests
create policy "loans: parties read" on public.loan_requests
  for select to authenticated using ((select auth.uid()) in (requester_id, owner_id));
create policy "loans: ask a playgroup peer" on public.loan_requests
  for insert to authenticated with check (requester_id = (select auth.uid()) and public.shares_playgroup(owner_id));
create policy "loans: parties update" on public.loan_requests
  for update to authenticated
  using ((select auth.uid()) in (requester_id, owner_id))
  with check ((select auth.uid()) in (requester_id, owner_id));
create policy "loans: requester cancels pending" on public.loan_requests
  for delete to authenticated using (requester_id = (select auth.uid()) and status = 'pending');

-- game_nights
create policy "game_nights: members read" on public.game_nights
  for select to authenticated using (public.is_playgroup_member(playgroup_id));
create policy "game_nights: members plan" on public.game_nights
  for insert to authenticated with check (public.is_playgroup_member(playgroup_id) and created_by = (select auth.uid()));
create policy "game_nights: members update" on public.game_nights
  for update to authenticated using (public.is_playgroup_member(playgroup_id)) with check (public.is_playgroup_member(playgroup_id));

-- rsvps
create policy "rsvps: members read" on public.rsvps
  for select to authenticated using (
    exists (select 1 from public.game_nights g where g.id = game_night_id and public.is_playgroup_member(g.playgroup_id))
  );
create policy "rsvps: answer own" on public.rsvps
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.game_nights g where g.id = game_night_id and public.is_playgroup_member(g.playgroup_id))
  );
create policy "rsvps: change own" on public.rsvps
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- games
create policy "games: members read" on public.games
  for select to authenticated using (public.is_playgroup_member(playgroup_id));
create policy "games: members log" on public.games
  for insert to authenticated with check (public.is_playgroup_member(playgroup_id) and created_by = (select auth.uid()));
