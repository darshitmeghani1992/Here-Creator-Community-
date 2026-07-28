-- ════════════════════════════════════════════════════════════════════════════
-- HERE MVP — initial schema, RLS, realtime, and seed.
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────────────────
create table if not exists creators (
  id            uuid primary key default gen_random_uuid(),
  handle        text unique not null,
  display_name  text not null,
  avatar_url    text,
  is_live       boolean default false,
  -- Extension beyond the base spec: links a creator to the auth user who owns
  -- it, so "only the creator can open rooms" (Step D) is expressible in RLS.
  owner_id      uuid references auth.users(id) on delete set null
);

create table if not exists rooms (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid references creators(id) on delete cascade,
  name        text not null,
  kind        text not null check (kind in ('permanent','temporary')),
  closes_at   timestamptz,               -- null = permanent
  is_open     boolean default true,
  created_at  timestamptz default now()
);

create table if not exists users (
  id            uuid primary key,        -- = auth.uid()
  display_name  text not null,
  avatar_url    text,
  is_guest      boolean default true
);

create table if not exists messages (
  id          bigint generated always as identity primary key,
  room_id     uuid references rooms(id) on delete cascade,
  user_id     uuid references users(id),
  body        text not null,
  is_creator  boolean default false,
  created_at  timestamptz default now()
);

create index if not exists messages_room_id_created_at_idx
  on messages (room_id, created_at);
create index if not exists rooms_open_idx on rooms (creator_id, is_open);

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table creators enable row level security;
alter table rooms    enable row level security;
alter table users    enable row level security;
alter table messages enable row level security;

-- Public read for the three world-readable tables.
drop policy if exists "creators readable" on creators;
create policy "creators readable" on creators for select using (true);

drop policy if exists "rooms readable" on rooms;
create policy "rooms readable" on rooms for select using (true);

drop policy if exists "messages readable" on messages;
create policy "messages readable" on messages for select using (true);

-- Any authenticated user (anonymous guests included) can post a message,
-- but only as themselves.
drop policy if exists "authed can insert messages" on messages;
create policy "authed can insert messages" on messages
  for insert to authenticated
  with check (user_id = auth.uid());

-- Only the creator that owns the space can create / modify its rooms.
drop policy if exists "owner can insert rooms" on rooms;
create policy "owner can insert rooms" on rooms
  for insert to authenticated
  with check (
    exists (
      select 1 from creators c
      where c.id = creator_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "owner can update rooms" on rooms;
create policy "owner can update rooms" on rooms
  for update to authenticated
  using (
    exists (
      select 1 from creators c
      where c.id = creator_id and c.owner_id = auth.uid()
    )
  );

-- A user may read any profile but only write their own row.
drop policy if exists "users readable" on users;
create policy "users readable" on users for select using (true);

drop policy if exists "user upserts self" on users;
create policy "user upserts self" on users
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "user updates self" on users;
create policy "user updates self" on users
  for update to authenticated
  using (id = auth.uid());

-- The creator that owns a space may claim ownership updates on their own row
-- (used by the "claim" step in the README). Left permissive for the owner only.
drop policy if exists "owner updates creator" on creators;
create policy "owner updates creator" on creators
  for update to authenticated
  using (owner_id = auth.uid());

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Emit change events for the room list and chat. (Wrapped so re-running is safe.)
do $$
begin
  begin
    alter publication supabase_realtime add table rooms;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table messages;
  exception when duplicate_object then null;
  end;
end $$;

-- ── Seed ────────────────────────────────────────────────────────────────────
-- One creator + the three rooms from the prototype. owner_id stays null until
-- you claim it (see README → "Become the creator").
insert into creators (handle, display_name, avatar_url, is_live)
values ('ananya', 'Ananya', null, true)
on conflict (handle) do nothing;

insert into rooms (creator_id, name, kind, closes_at, is_open)
select c.id, v.name, v.kind, v.closes_at, true
from creators c
cross join (values
  ('The Lounge',        'permanent'::text, null::timestamptz),
  ('New Video Chat',    'temporary',       now() + interval '4 hours'),
  ('Morning Movement',  'temporary',       now() + interval '42 minutes')
) as v(name, kind, closes_at)
where c.handle = 'ananya'
  and not exists (
    select 1 from rooms r where r.creator_id = c.id and r.name = v.name
  );

-- ── Auto-close (in-DB alternative) ──────────────────────────────────────────
-- The app ships a Vercel-Cron-driven route (/api/cron/close-rooms) as the
-- portable default. If you prefer to run the sweep inside Postgres, enable
-- pg_cron and uncomment:
--
--   create extension if not exists pg_cron;
--   select cron.schedule(
--     'here-close-expired-rooms', '* * * * *',
--     $$ update rooms set is_open = false
--        where is_open = true and closes_at is not null and closes_at < now() $$
--   );
