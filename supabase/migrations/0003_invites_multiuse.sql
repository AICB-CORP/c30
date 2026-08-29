-- 0003_invites_multiuse.sql
-- Make invite codes reusable by many friends (was single-use before).
--   used_at        -> first_used_at  (telemetry only, never blocks)
--   uses_count     -> number of signups performed with this code
--   max_uses       -> optional cap (NULL = unlimited). Shared friend code = NULL.

alter table public.invites rename column used_at to first_used_at;

alter table public.invites add column if not exists uses_count integer not null default 0;

alter table public.invites add column if not exists max_uses integer;

alter table public.invites
  add constraint invites_max_uses_positive
  check (max_uses is null or max_uses > 0);
