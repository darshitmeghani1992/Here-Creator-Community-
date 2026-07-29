-- ════════════════════════════════════════════════════════════════════════════
-- HERE — space-level polls + image options. Run once after 0005.
-- A poll now belongs to a space (creator); room_id is optional. When room_id
-- is null the poll lives in the space's Polls tab. Options can carry images.
-- ════════════════════════════════════════════════════════════════════════════

alter table polls add column if not exists space_id uuid references creators(id) on delete cascade;
alter table polls add column if not exists option_images text[]; -- parallel to options; '' = no image

-- Backfill space_id for existing room polls from their room's creator.
update polls p
set space_id = r.creator_id
from rooms r
where p.room_id = r.id and p.space_id is null;

-- Create / update permission is now based on owning the space (covers both
-- room polls and space polls, since both carry space_id).
drop policy if exists "owner creates poll" on polls;
create policy "owner creates poll" on polls
  for insert to authenticated
  with check (exists (
    select 1 from creators c where c.id = space_id and c.owner_id = auth.uid()
  ));

drop policy if exists "owner updates poll" on polls;
create policy "owner updates poll" on polls
  for update to authenticated
  using (exists (
    select 1 from creators c where c.id = space_id and c.owner_id = auth.uid()
  ));
