import type { Deadline, Recurrence } from "./types";

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

/** The nag day for a deadline = deadline date minus the lead time. */
export function nagDate(d: Deadline): string {
  return toISODate(addDays(fromISODate(d.deadline), -d.leadDays));
}

/** Date of the next upcoming `weekday` (0..6), starting from `from`. */
export function nextWeekday(weekday: number, from = new Date()): Date {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diff = (weekday - base.getDay() + 7) % 7 || 7;
  return addDays(base, diff);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function describeRecurrence(r: Recurrence): string {
  switch (r.type) {
    case "none":
      return "One-off";
    case "weekly":
      return `Every ${WEEKDAYS[r.weekday]}`;
    case "monthly": {
      const suffix = ordinalSuffix(r.day);
      return `${r.day}${suffix} of every month`;
    }
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

export interface DayMarkers {
  /** A deadline falls on this day. */
  deadlines: Deadline[];
  /** A nag/reminder day for these deadlines. */
  nags: Deadline[];
}

/** Compute which deadlines flag or nag on a given ISO date. */
export function markersForDate(deadlines: Deadline[], iso: string): DayMarkers {
  return {
    deadlines: deadlines.filter((d) => d.deadline === iso),
    nags: deadlines.filter((d) => nagDate(d) === iso),
  };
}

/** The status emoji(s) shown on a nag day. */
export function nagEmoji(d: Deadline): string {
  if (d.status === "done") return "✅";
  if (d.remindersSent <= 0) return "❗";
  return "❗".repeat(Math.min(d.remindersSent, 3));
}
