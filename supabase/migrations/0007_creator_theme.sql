-- ════════════════════════════════════════════════════════════════════════════
-- HERE — per-creator theme. Run once after 0006.
-- ════════════════════════════════════════════════════════════════════════════

-- The theme id (see lib/themes.ts) chosen for this space. Null = default.
alter table creators add column if not exists theme text;
