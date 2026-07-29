-- 0008 · Link-in-bio personalization
-- Profile fields + an appearance blob on creators, plus a links table.

-- ── Profile & appearance on the creator ──
alter table creators add column if not exists tagline text;
alter table creators add column if not exists bio text;
alter table creators add column if not exists cover_url text;
-- appearance: { background:{type,color,color2,angle,imageUrl}, button:{shape,fill,color,textColor,shadow}, font }
alter table creators add column if not exists appearance jsonb;

-- ── The link-in-bio link list ──
create table if not exists creator_links (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators(id) on delete cascade,
  title text not null,
  url text not null,
  icon text,                       -- an emoji or short glyph shown on the button
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists creator_links_creator_idx
  on creator_links (creator_id, position);

alter table creator_links enable row level security;

-- Anyone can read links (they render on the public space page).
drop policy if exists "creator_links read" on creator_links;
create policy "creator_links read" on creator_links
  for select using (true);

-- Only the owner of the space may add / edit / remove its links.
drop policy if exists "creator_links owner insert" on creator_links;
create policy "creator_links owner insert" on creator_links
  for insert with check (
    exists (select 1 from creators c where c.id = creator_id and c.owner_id = auth.uid())
  );

drop policy if exists "creator_links owner update" on creator_links;
create policy "creator_links owner update" on creator_links
  for update using (
    exists (select 1 from creators c where c.id = creator_id and c.owner_id = auth.uid())
  );

drop policy if exists "creator_links owner delete" on creator_links;
create policy "creator_links owner delete" on creator_links
  for delete using (
    exists (select 1 from creators c where c.id = creator_id and c.owner_id = auth.uid())
  );
