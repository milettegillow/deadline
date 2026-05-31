-- Deadline — migration: per-user settings
-- Run this in the Supabase SQL editor.
--
-- Stores defaults applied to NEW deadlines: who to nag and how many days of
-- lead time. One row per user.

create table if not exists public.user_settings (
  user_id                  uuid primary key references auth.users (id) on delete cascade,
  default_recipient_emails text[] not null default '{}',
  default_lead_days        int not null default 1,
  created_at               timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security — each user may read/write only their own row.
-- ---------------------------------------------------------------------------

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select using (user_id = auth.uid());

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
  for insert with check (user_id = auth.uid());

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own" on public.user_settings
  for delete using (user_id = auth.uid());
