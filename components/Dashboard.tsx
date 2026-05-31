"use client";

import { useState } from "react";
import Link from "next/link";
import Calendar from "@/components/Calendar";
import DeadlineList from "@/components/DeadlineList";
import DeadlineFormPanel from "@/components/DeadlineFormPanel";
import SignOutButton from "@/components/SignOutButton";
import type { Deadline, Occurrence } from "@/lib/types";

interface DashboardProps {
  userEmail: string;
  deadlines: Deadline[];
  occurrences: Occurrence[];
  defaultRecipients: string[];
  defaultLeadDays: number;
}

export default function Dashboard({
  userEmail,
  deadlines,
  occurrences,
  defaultRecipients,
  defaultLeadDays,
}: DashboardProps) {
  // `null` = panel closed. A Deadline = editing it. "new" = creating.
  const [editing, setEditing] = useState<Deadline | "new" | null>(null);

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[var(--background)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none" aria-hidden>
              🚩
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Deadline
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
            >
              <PlusIcon />
              <span className="hidden sm:inline">New deadline</span>
              <span className="sm:hidden">New</span>
            </button>
            <Link
              href="/settings"
              aria-label="Settings"
              title="Settings"
              className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <GearIcon />
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Page body */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Never miss a deadline again
          </h1>
          <p className="mt-2 max-w-xl text-slate-500">
            A friendly email assistant to nudge you the day before each
            deadline
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <Calendar deadlines={deadlines} occurrences={occurrences} />
          <DeadlineList
            deadlines={deadlines}
            occurrences={occurrences}
            onEdit={(d) => setEditing(d)}
            onNew={() => setEditing("new")}
          />
        </div>
      </div>

      {editing !== null && (
        <DeadlineFormPanel
          key={editing === "new" ? "new" : editing.id}
          userEmail={userEmail}
          defaultRecipients={defaultRecipients}
          defaultLeadDays={defaultLeadDays}
          deadline={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
