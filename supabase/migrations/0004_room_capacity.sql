-- ════════════════════════════════════════════════════════════════════════════
-- HERE — room member limit (capacity). Run once after 0003.
-- ════════════════════════════════════════════════════════════════════════════

-- Max people allowed in a room. NULL = unlimited.
alter table rooms add column if not exists capacity int;
