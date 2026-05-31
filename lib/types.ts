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
