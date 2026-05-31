export type RecurrenceType = "none" | "weekly" | "monthly";

export type Urgency = "regular" | "urgent";

/** A deadline as used by the UI — maps 1:1 onto the `deadlines` table plus
 *  its joined recipient emails. */
export interface Deadline {
  id: string;
  title: string;
  /** ISO date string, YYYY-MM-DD */
  deadlineDate: string;
  recurrence: RecurrenceType;
  /** 0 = Sunday … 6 = Saturday, only set when recurrence === "weekly". */
  weekday: number | null;
  /** 1..31, only set when recurrence === "monthly". */
  dayOfMonth: number | null;
  /** Days before the deadline to start nagging. */
  leadDays: number;
  urgency: Urgency;
  recipients: string[];
}

/** Shape of a row coming back from Supabase (snake_case + joined recipients). */
export interface DeadlineRow {
  id: string;
  title: string;
  deadline_date: string;
  recurrence: RecurrenceType;
  weekday: number | null;
  day_of_month: number | null;
  lead_days: number;
  urgency: Urgency;
  created_at: string;
  deadline_recipients: { id: string; email: string }[] | null;
}

/** Values collected by the New/Edit deadline form. */
export interface DeadlineFormValues {
  title: string;
  deadlineDate: string;
  recurrence: RecurrenceType;
  weekday: number;
  dayOfMonth: number;
  leadDays: number;
  urgency: Urgency;
  recipients: string[];
}

/** Column list for selecting a deadline plus its joined recipients. */
export const DEADLINE_SELECT =
  "id, title, deadline_date, recurrence, weekday, day_of_month, lead_days, urgency, created_at, deadline_recipients(id, email)";

export type OccurrenceStatus = "pending" | "done" | "skipped";

/** Row shape of the `occurrences` table. */
export interface OccurrenceRow {
  id: string;
  deadline_id: string;
  occurrence_date: string;
  status: OccurrenceStatus;
  reminder_sent_at: string | null;
  follow_up_sent_at: string | null;
  last_chance_sent_at: string | null;
  due_today_sent_at: string | null;
  done_at: string | null;
  skipped_at: string | null;
  done_token: string;
  created_at: string;
}

/** Occurrence as used by the UI. */
export interface Occurrence {
  id: string;
  deadlineId: string;
  occurrenceDate: string;
  status: OccurrenceStatus;
  reminderSentAt: string | null;
  followUpSentAt: string | null;
  lastChanceSentAt: string | null;
  dueTodaySentAt: string | null;
  doneAt: string | null;
  skippedAt: string | null;
  doneToken: string;
}

export const OCCURRENCE_SELECT =
  "id, deadline_id, occurrence_date, status, reminder_sent_at, follow_up_sent_at, last_chance_sent_at, due_today_sent_at, done_at, skipped_at, done_token";

export function rowToOccurrence(r: OccurrenceRow): Occurrence {
  return {
    id: r.id,
    deadlineId: r.deadline_id,
    occurrenceDate: r.occurrence_date,
    status: r.status,
    reminderSentAt: r.reminder_sent_at,
    followUpSentAt: r.follow_up_sent_at,
    lastChanceSentAt: r.last_chance_sent_at,
    dueTodaySentAt: r.due_today_sent_at,
    doneAt: r.done_at,
    skippedAt: r.skipped_at,
    doneToken: r.done_token,
  };
}

/** Number of nag-day reminder stages sent for an occurrence (0..3). */
export function stagesSent(o: Occurrence): number {
  return [o.reminderSentAt, o.followUpSentAt, o.lastChanceSentAt].filter(
    Boolean
  ).length;
}

/** Map a database row to the UI `Deadline` shape. */
export function rowToDeadline(row: DeadlineRow): Deadline {
  return {
    id: row.id,
    title: row.title,
    deadlineDate: row.deadline_date,
    recurrence: row.recurrence,
    weekday: row.weekday,
    dayOfMonth: row.day_of_month,
    leadDays: row.lead_days,
    urgency: row.urgency,
    recipients: (row.deadline_recipients ?? []).map((r) => r.email),
  };
}
