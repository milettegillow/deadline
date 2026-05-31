-- Deadline — migration: nullable deadline_date for recurring + last-day-of-month
-- Run this in the Supabase SQL editor.
--
-- One-off deadlines keep a real deadline_date; weekly/monthly deadlines are
-- defined by their recurrence, so deadline_date may be NULL for them.
-- `last_day_of_month` represents a monthly deadline that falls on the actual
-- last day of each month (28/29/30/31 as appropriate).

alter table public.deadlines
  alter column deadline_date drop not null;

alter table public.deadlines
  add column if not exists last_day_of_month boolean not null default false;
