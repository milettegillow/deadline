-- Deadline — migration: one-tap "mark done" token
-- Run this in the Supabase SQL editor (after occurrences.sql).
--
-- Adds an unguessable token to each occurrence so recipients can mark it done
-- from an email link without logging in. The NOT NULL default backfills every
-- existing row with its own random token.

alter table public.occurrences
  add column if not exists done_token uuid not null default gen_random_uuid();

-- Look-ups happen by token on the public /done/[token] route.
create unique index if not exists occurrences_done_token_idx
  on public.occurrences (done_token);
