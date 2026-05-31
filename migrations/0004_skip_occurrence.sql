-- Deadline — migration: skip an occurrence
-- Run this in the Supabase SQL editor (after 0003_done_token.sql).
--
-- Adds a third occurrence state, 'skipped', for "I'm consciously not doing this
-- one this cycle" — distinct from 'done' and from deleting the whole deadline.

-- Widen the status CHECK constraint to allow 'skipped'.
alter table public.occurrences
  drop constraint if exists occurrences_status_check;

alter table public.occurrences
  add constraint occurrences_status_check
  check (status in ('pending', 'done', 'skipped'));

-- When the occurrence was skipped (mirrors done_at).
alter table public.occurrences
  add column if not exists skipped_at timestamptz;
