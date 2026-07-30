-- 0009 · Fan progression foundation (Pick-and-Play)
-- Points, levels, streaks, and badges — a fan is a (creator, user) pair.
-- All point/badge writes happen server-side via the service role, so RLS here
-- is PUBLIC READ ONLY (leaderboards, fan status). No client writes → no forging.

create table if not exists fans (
  creator_id uuid not null references creators(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null default 0,
  level integer not null default 1,
  streak_days integer not null default 0,
  last_active_date date,
  joined_at timestamptz not null default now(),
  primary key (creator_id, user_id)
);
create index if not exists fans_creator_points_idx on fans (creator_id, points desc);

create table if not exists point_events (
  id bigint generated always as identity primary key,
  creator_id uuid not null references creators(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid,
  kind text not null,
  points integer not null,
  created_at timestamptz not null default now()
);
create index if not exists point_events_creator_created_idx on point_events (creator_id, created_at desc);
create index if not exists point_events_creator_user_idx on point_events (creator_id, user_id);

create table if not exists fan_badges (
  creator_id uuid not null references creators(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  awarded_at timestamptz not null default now(),
  primary key (creator_id, user_id, badge_key)
);

alter table fans enable row level security;
alter table point_events enable row level security;
alter table fan_badges enable row level security;

drop policy if exists "fans read" on fans;
create policy "fans read" on fans for select using (true);
drop policy if exists "point_events read" on point_events;
create policy "point_events read" on point_events for select using (true);
drop policy if exists "fan_badges read" on fan_badges;
create policy "fan_badges read" on fan_badges for select using (true);

-- Weekly leaderboard = points earned since a cutoff, aggregated per fan.
create or replace function weekly_leaderboard(cid uuid, since timestamptz)
returns table(user_id uuid, points bigint)
language sql
stable
as $$
  select user_id, sum(points)::bigint as points
  from point_events
  where creator_id = cid and created_at >= since
  group by user_id
  order by points desc
  limit 20;
$$;
