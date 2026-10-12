# Supabase SQL templates for Spellbinder

Copy and adapt. Wrap `auth.uid()` as `(select auth.uid())` inside policies so Postgres evaluates it once per query,
not once per row.

## Helper functions (put in 0001_init.sql)

```sql
-- security definer: reads playgroup_members without triggering its own RLS (avoids recursive policies).
create or replace function public.is_playgroup_member(pg uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.playgroup_members
    where playgroup_id = pg and user_id = auth.uid()
  );
$$;

-- True for yourself and anyone you share at least one playgroup with.
create or replace function public.shares_playgroup_with(other uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select other = auth.uid() or exists (
    select 1
    from public.playgroup_members me
    join public.playgroup_members them on them.playgroup_id = me.playgroup_id
    where me.user_id = auth.uid() and them.user_id = other
  );
$$;

revoke execute on function public.is_playgroup_member(uuid) from anon;
revoke execute on function public.shares_playgroup_with(uuid) from anon;
```

## A user-owned table (pattern for collection_items, decks)

```sql
create table if not exists public.collection_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  scryfall_id text not null references public.cards (scryfall_id),
  oracle_id   text not null,
  quantity    integer not null default 1 check (quantity >= 0),
  foil        boolean not null default false,
  condition   text not null default 'NM' check (condition in ('NM','LP','MP','HP','DMG')),
  created_at  timestamptz not null default now()
);
create index if not exists collection_items_user_id_idx on public.collection_items (user_id);
create index if not exists collection_items_oracle_id_idx on public.collection_items (oracle_id);

alter table public.collection_items enable row level security;

drop policy if exists "collection: read own and playgroup peers" on public.collection_items;
create policy "collection: read own and playgroup peers" on public.collection_items
  for select to authenticated
  using (public.shares_playgroup_with(user_id));

drop policy if exists "collection: write own" on public.collection_items;
create policy "collection: write own" on public.collection_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

## A child table that inherits its parent's owner (deck_cards)

```sql
create table if not exists public.deck_cards (
  deck_id      uuid not null references public.decks (id) on delete cascade,
  oracle_id    text not null,
  quantity     integer not null default 1 check (quantity > 0),
  category     text not null default 'Other',
  is_commander boolean not null default false,
  primary key (deck_id, oracle_id)        -- supabaseRepos upserts on 'deck_id,oracle_id'
);

alter table public.deck_cards enable row level security;

create policy "deck_cards: read with deck" on public.deck_cards
  for select to authenticated
  using (exists (select 1 from public.decks d
                 where d.id = deck_id and public.shares_playgroup_with(d.owner_id)));

create policy "deck_cards: write own deck" on public.deck_cards
  for all to authenticated
  using (exists (select 1 from public.decks d where d.id = deck_id and d.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.decks d where d.id = deck_id and d.owner_id = (select auth.uid())));
```

## Playgroup-scoped table (game_nights, games)

```sql
alter table public.games enable row level security;

create policy "games: members read" on public.games
  for select to authenticated using (public.is_playgroup_member(playgroup_id));

create policy "games: members log" on public.games
  for insert to authenticated with check (public.is_playgroup_member(playgroup_id));
```

RSVPs: members of the night's playgroup read; you write only rows where `user_id = auth.uid()`.
`rsvps` primary key `(game_night_id, user_id)` (the repo upserts on that pair).

## Loan requests (two parties)

```sql
alter table public.loan_requests enable row level security;

create policy "loans: parties read" on public.loan_requests
  for select to authenticated
  using ((select auth.uid()) in (requester_id, owner_id));

create policy "loans: requester creates" on public.loan_requests
  for insert to authenticated
  with check ((select auth.uid()) = requester_id
              and status = 'pending'
              and public.shares_playgroup_with(owner_id));

create policy "loans: parties update" on public.loan_requests
  for update to authenticated
  using ((select auth.uid()) in (requester_id, owner_id))
  with check ((select auth.uid()) in (requester_id, owner_id));
-- Finer rules (only the owner may set lent/declined) belong in a trigger or an RPC.
```

## Shared Scryfall cache (cards)

```sql
create table if not exists public.cards (
  scryfall_id text primary key,
  oracle_id   text not null,
  name        text not null,
  -- … every column in CardRow (src/data/supabase/mappers.ts) …
  legalities  jsonb not null default '{}',
  image_uris  jsonb,
  card_faces  jsonb,
  updated_at  timestamptz not null default now()
);
create index if not exists cards_oracle_id_idx on public.cards (oracle_id);

alter table public.cards enable row level security;
create policy "cards: authenticated read"   on public.cards for select to authenticated using (true);
create policy "cards: authenticated insert" on public.cards for insert to authenticated with check (true);
create policy "cards: authenticated update" on public.cards for update to authenticated using (true) with check (true);
```

## Profiles from auth

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, initials, avatar_color)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
          upper(left(coalesce(new.raw_user_meta_data ->> 'display_name', new.email), 2)),
          'gold');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
```

`avatar_color` must be a key of `avatarColors` in `src/theme/colors.ts` (the mapper falls back to `gold`).
