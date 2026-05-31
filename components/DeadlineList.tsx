"use client";

import { useState, useTransition } from "react";
import { stagesSent, type Deadline, type Occurrence } from "@/lib/types";
import {
  currentOccurrenceDate,
  describeRecurrence,
  nextOccurrenceLabel,
} from "@/lib/dateUtils";
import {
  deleteDeadline,
  markOccurrenceDone,
  sendTestReminder,
  skipOccurrence,
} from "@/app/actions";

interface DeadlineListProps {
  deadlines: Deadline[];
  occurrences: Occurrence[];
  onEdit: (d: Deadline) => void;
  onNew: () => void;
}

export default function DeadlineList({
  deadlines,
  occurrences,
  onEdit,
  onNew,
}: DeadlineListProps) {
  const occByKey = new Map<string, Occurrence>();
  for (const o of occurrences) {
    occByKey.set(`${o.deadlineId}|${o.occurrenceDate}`, o);
  }
  const currentOccurrence = (d: Deadline): Occurrence | undefined => {
    const date = currentOccurrenceDate(d);
    return date ? occByKey.get(`${d.id}|${date}`) : undefined;
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Your deadlines
      </h2>

      {deadlines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
          <p className="text-sm text-slate-500">No deadlines yet.</p>
          <button
            onClick={onNew}
            className="mt-3 text-sm font-medium text-accent-600 transition hover:text-accent-700"
          >
            Create your first one
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {deadlines.map((d) => (
            <DeadlineRow
              key={d.id}
              deadline={d}
              occurrence={currentOccurrence(d)}
              onEdit={onEdit}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DeadlineRow({
  deadline: d,
  occurrence,
  onEdit,
}: {
  deadline: Deadline;
  occurrence: Occurrence | undefined;
  onEdit: (d: Deadline) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [testPending, startTestTransition] = useTransition();
  const [donePending, startDoneTransition] = useTransition();
  const [skipPending, startSkipTransition] = useTransition();
  const [testStatus, setTestStatus] = useState<
    { kind: "ok" | "error"; message: string } | null
  >(null);

  const isDone = occurrence?.status === "done";
  const isSkipped = occurrence?.status === "skipped";
  const isResolved = isDone || isSkipped;
  const sent = occurrence ? stagesSent(occurrence) : 0;

  function handleDelete() {
    if (!confirm(`Delete “${d.title}”?`)) return;
    startTransition(() => {
      deleteDeadline(d.id);
    });
  }

  function handleMarkDone() {
    startDoneTransition(() => {
      markOccurrenceDone(d.id);
    });
  }

  function handleSkip() {
    if (!confirm(`Skip “${d.title}” this time?`)) return;
    startSkipTransition(() => {
      skipOccurrence(d.id);
    });
  }

  function handleTest() {
    setTestStatus(null);
    startTestTransition(async () => {
      const result = await sendTestReminder(d.id);
      if (result.error) {
        setTestStatus({ kind: "error", message: result.error });
      } else {
        setTestStatus({
          kind: "ok",
          message: `Sent to ${d.recipients.length} recipient${
            d.recipients.length === 1 ? "" : "s"
          }.`,
        });
      }
    });
  }

  return (
    <li className="group rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {d.urgency === "urgent" && (
              <span title="Urgent" className="leading-none">
                🚨
              </span>
            )}
            <h3 className="truncate font-medium text-slate-900">{d.title}</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {nextOccurrenceLabel(d)}
            <span className="px-1.5 text-slate-300">•</span>
            {describeRecurrence(d)}
          </p>
          {d.recipients.length > 0 && (
            <p className="mt-1 truncate text-xs text-slate-400">
              {d.recipients.length} recipient
              {d.recipients.length === 1 ? "" : "s"}
            </p>
          )}
          <div className="mt-1.5 text-xs">
            {isDone ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                ✅ Done
              </span>
            ) : isSkipped ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                <span className="grayscale opacity-60">⏭️</span> Skipped
              </span>
            ) : sent > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                {"❗".repeat(sent)} Nagging
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                Scheduled
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onEdit(d)}
            aria-label={`Edit ${d.title}`}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <EditIcon />
          </button>
          <button
            onClick={handleDelete}
            disabled={pending}
            aria-label={`Delete ${d.title}`}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Test-only: send the 'reminder' template now to check delivery. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3">
        {!isResolved && (
          <button
            onClick={handleMarkDone}
            disabled={donePending}
            className="inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-emerald-600 transition hover:text-emerald-700 disabled:opacity-60"
          >
            <CheckIcon />
            {donePending ? "Saving…" : "Mark done"}
          </button>
        )}
        {!isResolved && (
          <button
            onClick={handleSkip}
            disabled={skipPending}
            className="inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-slate-500 transition hover:text-slate-700 disabled:opacity-60"
          >
            <SkipIcon />
            {skipPending ? "Skipping…" : "Skip this one"}
          </button>
        )}
        <button
          onClick={handleTest}
          disabled={testPending}
          className="inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-accent-600 transition hover:text-accent-700 disabled:opacity-60"
        >
          <MailIcon />
          {testPending ? "Sending…" : "Send test reminder"}
        </button>
        {testStatus && (
          <span
            className={
              testStatus.kind === "ok"
                ? "text-xs text-emerald-600"
                : "text-xs text-red-600"
            }
          >
            {testStatus.message}
          </span>
        )}
      </div>
    </li>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4l10 8-10 8V4zM19 5v14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m3.5 6.5 8.5 7 8.5-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
