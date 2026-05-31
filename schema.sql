-- Deadline — database schema
-- Run this in the Supabase SQL editor.
--
-- Two tables: `deadlines` (owned by a user) and `deadline_recipients`
-- (the email addresses that get nagged for a given deadline).
-- Row Level Security ensures each user only ever sees/edits their own rows.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.deadlines (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  deadline_date date not null,
  recurrence    text not null default 'none'
                  check (recurrence in ('none', 'weekly', 'monthly')),
  weekday       int check (weekday between 0 and 6),       -- 0=Sun..6=Sat, for weekly
  day_of_month  int check (day_of_month between 1 and 31), -- for monthly
  lead_days     int not null default 1,
  urgency       text not null default 'regular'
                  check (urgency in ('regular', 'urgent')),
  created_at    timestamptz not null default now()
);

create table if not exists public.deadline_recipients (
  id          uuid primary key default gen_random_uuid(),
  deadline_id uuid not null references public.deadlines (id) on delete cascade,
  email       text not null
);

create index if not exists deadlines_user_id_idx
  on public.deadlines (user_id);
create index if not exists deadline_recipients_deadline_id_idx
  on public.deadline_recipients (deadline_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.deadlines enable row level security;
alter table public.deadline_recipients enable row level security;

-- deadlines: a user can only touch rows they own.
drop policy if exists "deadlines_select_own" on public.deadlines;
create policy "deadlines_select_own" on public.deadlines
  for select using (user_id = auth.uid());

drop policy if exists "deadlines_insert_own" on public.deadlines;
create policy "deadlines_insert_own" on public.deadlines
  for insert with check (user_id = auth.uid());

drop policy if exists "deadlines_update_own" on public.deadlines;
create policy "deadlines_update_own" on public.deadlines
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "deadlines_delete_own" on public.deadlines;
create policy "deadlines_delete_own" on public.deadlines
  for delete using (user_id = auth.uid());

-- deadline_recipients: only for deadlines the user owns. Ownership is checked
-- by looking up the parent deadline's user_id.
drop policy if exists "recipients_select_own" on public.deadline_recipients;
create policy "recipients_select_own" on public.deadline_recipients
  for select using (
    exists (
      select 1 from public.deadlines d
      where d.id = deadline_recipients.deadline_id
        and d.user_id = auth.uid()
    )
  );

drop policy if exists "recipients_insert_own" on public.deadline_recipients;
create policy "recipients_insert_own" on public.deadline_recipients
  for insert with check (
    exists (
      select 1 from public.deadlines d
      where d.id = deadline_recipients.deadline_id
        and d.user_id = auth.uid()
    )
  );

drop policy if exists "recipients_update_own" on public.deadline_recipients;
create policy "recipients_update_own" on public.deadline_recipients
  for update using (
    exists (
      select 1 from public.deadlines d
      where d.id = deadline_recipients.deadline_id
        and d.user_id = auth.uid()
    )
  );

drop policy if exists "recipients_delete_own" on public.deadline_recipients;
create policy "recipients_delete_own" on public.deadline_recipients
  for delete using (
    exists (
      select 1 from public.deadlines d
      where d.id = deadline_recipients.deadline_id
        and d.user_id = auth.uid()
    )
  );
