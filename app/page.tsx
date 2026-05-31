"use client";

import { useState } from "react";
import Calendar from "@/components/Calendar";
import DeadlineList from "@/components/DeadlineList";
import NewDeadlineModal from "@/components/NewDeadlineModal";
import { mockDeadlines } from "@/lib/mockData";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[var(--background)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500 text-lg shadow-sm"
              aria-hidden
            >
              🚩
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Deadline
            </span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
          >
            <PlusIcon />
            New deadline
          </button>
        </div>
      </header>

      {/* Page body */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Never miss a deadline again
          </h1>
          <p className="mt-2 max-w-xl text-slate-500">
            Set a deadline and a friendly email assistant nags you the day
            before — and keeps nagging until you reply that it&apos;s done.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <Calendar deadlines={mockDeadlines} />
          <DeadlineList deadlines={mockDeadlines} />
        </div>
      </div>

      <NewDeadlineModal open={modalOpen} onClose={() => setModalOpen(false)} />
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
