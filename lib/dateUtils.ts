import { stagesSent, type Deadline, type Occurrence, type RecurrenceType } from "./types";

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAYS_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Format a Date as a local YYYY-MM-DD string (no timezone surprises). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD string into a local Date at midnight. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function describeRecurrence(d: {
  recurrence: RecurrenceType;
  weekday: number | null;
  dayOfMonth: number | null;
}): string {
  switch (d.recurrence) {
    case "none":
      return "One-off";
    case "weekly":
      return d.weekday == null ? "Weekly" : `Every ${WEEKDAYS[d.weekday]}`;
    case "monthly":
      return d.dayOfMonth == null
        ? "Monthly"
        : `${d.dayOfMonth}${ordinalSuffix(d.dayOfMonth)} of every month`;
  }
}

export function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/** Human-friendly date label, e.g. "Thu, 4 Jun". */
export function formatDateLabel(iso: string): string {
  const d = fromISODate(iso);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS[
    d.getMonth()
  ].slice(0, 3)}`;
}

/** A short label for the next upcoming occurrence of a deadline. */
export function nextOccurrenceLabel(d: Deadline, from = new Date()): string {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  // Look ahead far enough to find the next monthly/weekly hit.
  for (let i = 0; i < 366; i++) {
    const day = addDays(base, i);
    if (occursOn(d, day)) return formatDateLabel(toISODate(day));
  }
  return formatDateLabel(d.deadlineDate);
}

/** Does this deadline have an occurrence on the given date? */
export function occursOn(d: Deadline, date: Date): boolean {
  switch (d.recurrence) {
    case "none":
      return d.deadlineDate === toISODate(date);
    case "weekly":
      return d.weekday != null && date.getDay() === d.weekday;
    case "monthly":
      return d.dayOfMonth != null && date.getDate() === d.dayOfMonth;
  }
}

/** All ISO dates in the given month where this deadline occurs. */
export function occurrencesForMonth(
  d: Deadline,
  year: number,
  month: number
): string[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const out: string[] = [];

  if (d.recurrence === "none") {
    const dd = fromISODate(d.deadlineDate);
    if (dd.getFullYear() === year && dd.getMonth() === month) {
      out.push(d.deadlineDate);
    }
  } else if (d.recurrence === "weekly" && d.weekday != null) {
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === d.weekday) out.push(toISODate(date));
    }
  } else if (d.recurrence === "monthly" && d.dayOfMonth != null) {
    if (d.dayOfMonth <= daysInMonth) {
      out.push(toISODate(new Date(year, month, d.dayOfMonth)));
    }
  }
  return out;
}

/** The deadline_date of the occurrence currently in play (client-local). */
export function currentOccurrenceDate(
  d: Deadline,
  from = new Date()
): string | null {
  if (d.recurrence === "none") return d.deadlineDate;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < 366; i++) {
    const date = addDays(today, i);
    if (occursOn(d, date)) return toISODate(date);
  }
  return null;
}

export interface FlagMark {
  deadline: Deadline;
  occurrenceDate: string;
}

export interface NagMark {
  deadline: Deadline;
  occurrenceDate: string;
  /** Nag-day stages sent so far (0..3) → ❗ count. */
  stagesSent: number;
  done: boolean;
}

export interface DayMarkers {
  /** A deadline date falls on this day → 🚩. */
  flags: FlagMark[];
  /** A nag day (deadline − lead_days) falls on this day → ❗/✅. */
  nags: NagMark[];
}

/**
 * Build a lookup of markers per ISO date for the month being viewed, enriched
 * with each occurrence's send/done status. Occurrences are computed across the
 * previous, current and next month so nag days that spill across month
 * boundaries still render correctly.
 */
export function buildMonthMarkers(
  deadlines: Deadline[],
  occurrences: Occurrence[],
  viewYear: number,
  viewMonth: number
): Map<string, DayMarkers> {
  const occByKey = new Map<string, Occurrence>();
  for (const o of occurrences) {
    occByKey.set(`${o.deadlineId}|${o.occurrenceDate}`, o);
  }

  const map = new Map<string, DayMarkers>();
  const ensure = (iso: string): DayMarkers => {
    let entry = map.get(iso);
    if (!entry) {
      entry = { flags: [], nags: [] };
      map.set(iso, entry);
    }
    return entry;
  };

  // Window: previous, current, next month.
  for (let offset = -1; offset <= 1; offset++) {
    const ref = new Date(viewYear, viewMonth + offset, 1);
    const y = ref.getFullYear();
    const m = ref.getMonth();

    for (const d of deadlines) {
      for (const iso of occurrencesForMonth(d, y, m)) {
        const occ = occByKey.get(`${d.id}|${iso}`);
        ensure(iso).flags.push({ deadline: d, occurrenceDate: iso });

        const nagIso = toISODate(addDays(fromISODate(iso), -d.leadDays));
        ensure(nagIso).nags.push({
          deadline: d,
          occurrenceDate: iso,
          stagesSent: occ ? stagesSent(occ) : 0,
          done: occ?.status === "done",
        });
      }
    }
  }

  return map;
}
