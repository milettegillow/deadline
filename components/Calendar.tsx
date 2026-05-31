"use client";

import { useMemo, useState } from "react";
import type { Deadline, Occurrence } from "@/lib/types";
import {
  MONTHS,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  buildMonthMarkers,
  fromISODate,
  isSameDay,
  toISODate,
  type FlagMark,
  type NagMark,
} from "@/lib/dateUtils";

interface CalendarProps {
  deadlines: Deadline[];
  occurrences: Occurrence[];
}

// How many chips to show in a cell before collapsing into "+N more".
const MAX_VISIBLE = 3;

export default function Calendar({ deadlines, occurrences }: CalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [openDay, setOpenDay] = useState<string | null>(null);

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const markers = useMemo(
    () => buildMonthMarkers(deadlines, occurrences, viewYear, viewMonth),
    [deadlines, occurrences, viewYear, viewMonth]
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
          if (!date) return <div key={`blank-${i}`} className="min-h-[76px]" />;

          const iso = toISODate(date);
          const day = markers.get(iso);
          const flags = day?.flags ?? [];
          const nags = day?.nags ?? [];
          const isToday = isSameDay(date, today);
          const hasNag = nags.length > 0;
          const itemCount = flags.length + nags.length;

          // Deadline chips first, then reminder chips.
          const items: ItemNode[] = [
            ...flags.map((f) => ({ kind: "flag" as const, mark: f })),
            ...nags.map((n) => ({ kind: "nag" as const, mark: n })),
          ];
          const visible =
            items.length > MAX_VISIBLE ? items.slice(0, MAX_VISIBLE - 1) : items;
          const hidden = items.length - visible.length;

          const cellClass = [
            "flex min-h-[76px] flex-col rounded-xl border p-1 text-left transition sm:min-h-[92px]",
            // Reminder-day cells stay dotted + grey whether or not ❗s show yet.
            hasNag
              ? "border-dashed border-slate-300 bg-slate-50"
              : "border-transparent hover:border-slate-200 hover:bg-slate-50",
            isToday ? "ring-2 ring-inset ring-accent-400" : "",
          ].join(" ");

          const inner = (
            <>
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
              <div className="mt-0.5 flex flex-col gap-0.5 overflow-hidden">
                {visible.map((item, idx) => (
                  <Chip key={idx} item={item} />
                ))}
                {hidden > 0 && (
                  <span className="px-1 text-[10px] font-medium text-slate-500">
                    +{hidden} more
                  </span>
                )}
              </div>
            </>
          );

          return itemCount > 0 ? (
            <button
              key={iso}
              onClick={() => setOpenDay(iso)}
              aria-label={`${date.getDate()} — view ${itemCount} item${
                itemCount === 1 ? "" : "s"
              }`}
              className={`${cellClass} cursor-pointer`}
            >
              {inner}
            </button>
          ) : (
            <div key={iso} className={cellClass}>
              {inner}
            </div>
          );
        })}
      </div>

      <Legend />

      {openDay && (
        <DayOverlay
          iso={openDay}
          flags={markers.get(openDay)?.flags ?? []}
          nags={markers.get(openDay)?.nags ?? []}
          onClose={() => setOpenDay(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item views
// ---------------------------------------------------------------------------

type ItemNode =
  | { kind: "flag"; mark: FlagMark }
  | { kind: "nag"; mark: NagMark };

interface ItemView {
  emoji: string;
  dot: boolean; // render a small dashed dot instead of an emoji
  muted: boolean;
  title: string;
  status: string;
  chipClass: string;
}

function flagView(f: FlagMark): ItemView {
  const urgent = f.deadline.urgency === "urgent";
  return {
    emoji: urgent ? "🚨" : "🚩",
    dot: false,
    muted: false,
    title: f.deadline.title,
    status: urgent ? "Urgent — due" : "Due",
    chipClass: urgent
      ? "bg-red-50 text-red-700"
      : "bg-accent-50 text-accent-700",
  };
}

function nagView(n: NagMark): ItemView {
  const base = { dot: false, muted: false, title: n.deadline.title };
  if (n.done) {
    return { ...base, emoji: "✅", status: "Done", chipClass: "bg-emerald-50 text-emerald-700" };
  }
  if (n.skipped) {
    return {
      ...base,
      emoji: "⏭️",
      muted: true,
      status: "Skipped this cycle",
      chipClass: "bg-slate-100 text-slate-400",
    };
  }
  if (n.stagesSent > 0) {
    return {
      ...base,
      emoji: "❗".repeat(n.stagesSent),
      status: `${n.stagesSent} reminder${n.stagesSent === 1 ? "" : "s"} sent`,
      chipClass: "bg-amber-50 text-amber-700",
    };
  }
  return {
    ...base,
    emoji: "",
    dot: true,
    status: "Reminder day",
    chipClass: "bg-slate-100 text-slate-500",
  };
}

function viewOf(item: ItemNode): ItemView {
  return item.kind === "flag" ? flagView(item.mark) : nagView(item.mark);
}

function Chip({ item }: { item: ItemNode }) {
  const v = viewOf(item);
  return (
    <span
      title={`${v.title} — ${v.status}`}
      className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight ${v.chipClass} ${
        v.muted ? "opacity-70" : ""
      }`}
    >
      {v.dot ? (
        <span className="h-2 w-2 shrink-0 rounded-full border border-dashed border-slate-400" />
      ) : (
        <span className={`shrink-0 ${v.muted ? "grayscale" : ""}`}>
          {v.emoji}
        </span>
      )}
      <span className="truncate">{v.title}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Day overlay (popover listing everything on a day)
// ---------------------------------------------------------------------------

function DayOverlay({
  iso,
  flags,
  nags,
  onClose,
}: {
  iso: string;
  flags: FlagMark[];
  nags: NagMark[];
  onClose: () => void;
}) {
  const d = fromISODate(iso);
  const items: ItemNode[] = [
    ...flags.map((f) => ({ kind: "flag" as const, mark: f })),
    ...nags.map((n) => ({ kind: "nag" as const, mark: n })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="font-semibold text-slate-900">
            {WEEKDAYS[d.getDay()]}
            <span className="block text-sm font-normal text-slate-500">
              {d.getDate()} {MONTHS[d.getMonth()]} {d.getFullYear()}
            </span>
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing scheduled.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item, idx) => {
              const v = viewOf(item);
              return (
                <li
                  key={idx}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm ${v.chipClass} ${
                      v.muted ? "grayscale" : ""
                    }`}
                  >
                    {v.dot ? (
                      <span className="h-2.5 w-2.5 rounded-full border border-dashed border-slate-400" />
                    ) : (
                      v.emoji.slice(0, 2)
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {v.title}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {v.status}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
      <LegendChip emoji="🚩" label="Deadline" className="bg-accent-50 text-accent-700" />
      <LegendChip emoji="🚨" label="Urgent" className="bg-red-50 text-red-700" />
      <LegendReminderCell />
      <LegendItem emoji="❗" label="Reminder sent (1–3)" />
      <LegendItem emoji="✅" label="Done" />
      <LegendItem emoji="⏭️" label="Skipped" muted />
    </div>
  );
}

function LegendChip({
  emoji,
  label,
  className,
}: {
  emoji: string;
  label: string;
  className: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${className}`}
      >
        {emoji}
      </span>
      {label}
    </span>
  );
}

function LegendReminderCell() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-4 w-4 rounded-md border border-dashed border-slate-300 bg-slate-50" />
      Reminder day
    </span>
  );
}

function LegendItem({
  emoji,
  label,
  muted,
}: {
  emoji: string;
  label: string;
  muted?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`leading-none ${muted ? "grayscale opacity-50" : ""}`}>
        {emoji}
      </span>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

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

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
