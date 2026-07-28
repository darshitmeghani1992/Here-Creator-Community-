-- ════════════════════════════════════════════════════════════════════════════
-- HERE — chat attachments (images, files, short videos).
-- Adds attachment columns to messages and a Storage bucket for the files.
-- Run once after 0002.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Message columns ─────────────────────────────────────────────────────────
alter table messages
  add column if not exists attachment_url  text,
  add column if not exists attachment_type text,   -- 'image' | 'video' | 'file'
  add column if not exists attachment_name text;    -- original filename

-- A message may now be attachment-only, so an empty body is allowed.
alter table messages alter column body set default '';

-- ── Storage bucket ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Anyone can view attachments (rooms are public).
drop policy if exists "attachments public read" on storage.objects;
create policy "attachments public read" on storage.objects
  for select using (bucket_id = 'attachments');

-- Any signed-in user (guests included) can upload into the bucket.
drop policy if exists "attachments authed upload" on storage.objects;
create policy "attachments authed upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments');
