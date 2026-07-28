-- ════════════════════════════════════════════════════════════════════════════
-- HERE — self-serve creator spaces.
-- Lets a signed-in user create their OWN space (a `creators` row they own),
-- instead of spaces only existing via the seed. Run once after 0001.
-- ════════════════════════════════════════════════════════════════════════════

-- A signed-in user may create a space, but only one they own.
drop policy if exists "user creates own creator" on creators;
create policy "user creates own creator" on creators
  for insert to authenticated
  with check (owner_id = auth.uid());

-- One space per account (keeps handles/ownership simple for the MVP). The
-- partial unique index ignores the seeded rows whose owner_id is null.
create unique index if not exists creators_owner_unique
  on creators (owner_id)
  where owner_id is not null;
