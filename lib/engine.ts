import { DateTime } from "luxon";
import type { Deadline } from "./types";

/** All scheduling is done in UK local time, handling BST/GMT automatically. */
export const TIMEZONE = "Europe/London";

export type StageKey = "reminder" | "follow_up" | "last_chance" | "due_today";
export type StageColumn =
  | "reminder_sent_at"
  | "follow_up_sent_at"
  | "last_chance_sent_at"
  | "due_today_sent_at";

export interface StageDef {
  key: StageKey;
  column: StageColumn;
  /** When this stage is scheduled to fire (an instant, London-aware). */
  at: DateTime;
}

/** Midnight (London) for a YYYY-MM-DD date. */
function londonMidnight(isoDate: string): DateTime {
  return DateTime.fromISO(isoDate, { zone: TIMEZONE }).startOf("day");
}

/**
 * The deadline_date of the occurrence currently in play for a deadline.
 *  - none:    its single deadline_date
 *  - weekly:  the next matching weekday on/after today
 *  - monthly: the next valid day_of_month on/after today
 * Returns a YYYY-MM-DD string, or null if it can't be determined.
 */
export function currentOccurrenceDate(
  deadline: Deadline,
  now: DateTime = DateTime.now()
): string | null {
  const today = now.setZone(TIMEZONE).startOf("day");

  if (deadline.recurrence === "none") {
    return deadline.deadlineDate;
  }

  if (deadline.recurrence === "weekly" && deadline.weekday != null) {
    // Stored weekday is 0=Sun..6=Sat; luxon weekday is 1=Mon..7=Sun.
    for (let i = 0; i < 14; i++) {
      const d = today.plus({ days: i });
      const jsDow = d.weekday % 7; // 7(Sun)->0, 1(Mon)->1 … 6(Sat)->6
      if (jsDow === deadline.weekday) return d.toISODate();
    }
    return null;
  }

  if (deadline.recurrence === "monthly" && deadline.dayOfMonth != null) {
    const monthStart = today.startOf("month");
    for (let i = 0; i < 24; i++) {
      const month = monthStart.plus({ months: i });
      if (deadline.dayOfMonth <= (month.daysInMonth ?? 31)) {
        const date = month.set({ day: deadline.dayOfMonth });
        if (date >= today) return date.toISODate();
      }
    }
    return null;
  }

  return null;
}

/**
 * The four scheduled send times for an occurrence:
 *  - nag day (deadline − lead_days): 12:00 reminder, 18:00 follow_up, 21:00 last_chance
 *  - deadline day: 07:00 due_today
 */
export function stageTimes(
  occurrenceDate: string,
  leadDays: number
): StageDef[] {
  const occ = londonMidnight(occurrenceDate);
  const nag = occ.minus({ days: leadDays });
  return [
    { key: "reminder", column: "reminder_sent_at", at: nag.set({ hour: 12 }) },
    { key: "follow_up", column: "follow_up_sent_at", at: nag.set({ hour: 18 }) },
    {
      key: "last_chance",
      column: "last_chance_sent_at",
      at: nag.set({ hour: 21 }),
    },
    { key: "due_today", column: "due_today_sent_at", at: occ.set({ hour: 7 }) },
  ];
}

/** Has `now` passed the end of the occurrence's deadline day (London)? */
export function isPastOccurrence(
  occurrenceDate: string,
  now: DateTime = DateTime.now()
): boolean {
  return now > londonMidnight(occurrenceDate).endOf("day");
}
