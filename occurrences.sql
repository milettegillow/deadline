-- Deadline — migration: occurrences tracking table
-- Run this in the Supabase SQL editor (after schema.sql).
--
-- One row per (deadline, occurrence_date). The reminder engine creates these
-- as it works and stamps each send time; marking an occurrence done stops
-- further reminders for that occurrence.

create table if not exists public.occurrences (
  id                 uuid primary key default gen_random_uuid(),
  deadline_id        uuid not null references public.deadlines (id) on delete cascade,
  occurrence_date    date not null,                 -- the deadline date for this occurrence
  status             text not null default 'pending'
                       check (status in ('pending', 'done')),
  reminder_sent_at   timestamptz,
  follow_up_sent_at  timestamptz,
  last_chance_sent_at timestamptz,
  due_today_sent_at  timestamptz,
  done_at            timestamptz,
  created_at         timestamptz not null default now(),
  unique (deadline_id, occurrence_date)
);

create index if not exists occurrences_deadline_id_idx
  on public.occurrences (deadline_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — a user may read/insert/update occurrences belonging to
-- their own deadlines. (The cron engine uses the service-role key, which
-- bypasses RLS.)
-- ---------------------------------------------------------------------------

alter table public.occurrences enable row level security;

drop policy if exists "occurrences_select_own" on public.occurrences;
create policy "occurrences_select_own" on public.occurrences
  for select using (
    exists (
      select 1 from public.deadlines d
      where d.id = occurrences.deadline_id
        and d.user_id = auth.uid()
    )
  );

drop policy if exists "occurrences_insert_own" on public.occurrences;
create policy "occurrences_insert_own" on public.occurrences
  for insert with check (
    exists (
      select 1 from public.deadlines d
      where d.id = occurrences.deadline_id
        and d.user_id = auth.uid()
    )
  );

drop policy if exists "occurrences_update_own" on public.occurrences;
create policy "occurrences_update_own" on public.occurrences
  for update using (
    exists (
      select 1 from public.deadlines d
      where d.id = occurrences.deadline_id
        and d.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.deadlines d
      where d.id = occurrences.deadline_id
        and d.user_id = auth.uid()
    )
  );
