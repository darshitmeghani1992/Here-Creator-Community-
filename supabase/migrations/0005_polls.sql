-- ════════════════════════════════════════════════════════════════════════════
-- HERE — polls in rooms. A creator can run a poll; everyone votes live.
-- Run once after 0004.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists polls (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid references rooms(id) on delete cascade,
  creator_id  uuid references auth.users(id) on delete set null,
  question    text not null,
  options     text[] not null,
  is_open     boolean default true,
  created_at  timestamptz default now()
);

create table if not exists poll_votes (
  poll_id       uuid references polls(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  option_index  int not null,
  created_at    timestamptz default now(),
  primary key (poll_id, user_id)   -- one vote per person (updatable)
);

create index if not exists polls_room_idx on polls (room_id, is_open, created_at desc);

alter table polls      enable row level security;
alter table poll_votes enable row level security;

-- Everyone can read polls + tallies.
drop policy if exists "polls readable" on polls;
create policy "polls readable" on polls for select using (true);
drop policy if exists "poll_votes readable" on poll_votes;
create policy "poll_votes readable" on poll_votes for select using (true);

-- Only the room's owner can open / close a poll in it.
drop policy if exists "owner creates poll" on polls;
create policy "owner creates poll" on polls
  for insert to authenticated
  with check (exists (
    select 1 from rooms r join creators c on c.id = r.creator_id
    where r.id = room_id and c.owner_id = auth.uid()
  ));

drop policy if exists "owner updates poll" on polls;
create policy "owner updates poll" on polls
  for update to authenticated
  using (exists (
    select 1 from rooms r join creators c on c.id = r.creator_id
    where r.id = room_id and c.owner_id = auth.uid()
  ));

-- Any signed-in user (guests included) votes as themselves; the primary key
-- keeps it to one vote each, and they may change it (update).
drop policy if exists "user votes" on poll_votes;
create policy "user votes" on poll_votes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "user updates own vote" on poll_votes;
create policy "user updates own vote" on poll_votes
  for update to authenticated using (user_id = auth.uid());

-- Realtime for live polls + live tallies.
do $$
begin
  begin alter publication supabase_realtime add table polls; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table poll_votes; exception when duplicate_object then null; end;
end $$;
