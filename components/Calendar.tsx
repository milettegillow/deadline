"use client";

import { useMemo, useState } from "react";
import type { Deadline } from "@/lib/types";
import {
  MONTHS,
  WEEKDAYS_SHORT,
  buildMonthMarkers,
  isSameDay,
  toISODate,
} from "@/lib/dateUtils";

interface CalendarProps {
  deadlines: Deadline[];
}

export default function Calendar({ deadlines }: CalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const markers = useMemo(
    () => buildMonthMarkers(deadlines, viewYear, viewMonth),
    [deadlines, viewYear, viewMonth]
  );

  // Leading blanks so the 1st lands under the right weekday column.
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(new Date(viewYear, viewMonth, d));
  while (cells.length % 7 !== 0) cells.push(null);

  function goToMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      {/* Header: month label + navigation */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            {MONTHS[viewMonth]}
          </h2>
          <span className="text-lg font-normal text-slate-400">{viewYear}</span>
        </div>
        <div className="flex items-center gap-1">
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              className="mr-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-accent-600 transition hover:bg-accent-50"
            >
              Today
            </button>
          )}
          <button
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => goToMonth(1)}
            aria-label="Next month"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* Weekday headings */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS_SHORT.map((wd) => (
          <div
            key={wd}
            className="py-1 text-center text-xs font-medium uppercase tracking-wide text-slate-400"
          >
            <span className="hidden sm:inline">{wd}</span>
            <span className="sm:hidden">{wd[0]}</span>
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} className="aspect-square" />;

          const iso = toISODate(date);
          const day = markers.get(iso);
          const flags = day?.flags ?? [];
          const nags = day?.nags ?? [];
          const isToday = isSameDay(date, today);
          const hasUrgent = flags.some((d) => d.urgency === "urgent");

          return (
            <div
              key={iso}
              className={[
                "flex aspect-square flex-col rounded-xl border p-1.5 text-left transition",
                isToday
                  ? "border-accent-400 bg-accent-50"
                  : "border-transparent hover:border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              <span
                className={[
                  "text-xs font-medium",
                  isToday
                    ? "flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-white"
                    : "text-slate-500",
                ].join(" ")}
              >
                {date.getDate()}
              </span>

              {/* Markers */}
              <div className="mt-auto flex flex-wrap items-center gap-0.5 text-sm leading-none">
                {flags.map((d, idx) => (
                  <span
                    key={`flag-${d.id}-${idx}`}
                    title={`${d.title} — due`}
                    className="leading-none"
                  >
                    {hasUrgent && d.urgency === "urgent" ? "🚨" : "🚩"}
                  </span>
                ))}
                {/* Nag day: placeholder slot for status emojis (wired up later). */}
                {nags.map((d, idx) => (
                  <span
                    key={`nag-${d.id}-${idx}`}
                    title={`${d.title} — reminder day`}
                    aria-label="reminder slot"
                    className="inline-block h-3 w-3 rounded-full border border-dashed border-slate-300"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <LegendItem emoji="🚩" label="Deadline" />
        <LegendItem emoji="🚨" label="Urgent deadline" />
        <LegendSlot label="Reminder day (status coming soon)" />
      </div>
    </div>
  );
}

function LegendItem({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="leading-none">{emoji}</span>
      {label}
    </span>
  );
}

function LegendSlot({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded-full border border-dashed border-slate-300" />
      {label}
    </span>
  );
}

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 18l6-6-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
