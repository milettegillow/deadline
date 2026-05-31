"use client";

import { useState, useTransition } from "react";
import type {
  Deadline,
  DeadlineFormValues,
  RecurrenceType,
  Urgency,
} from "@/lib/types";
import { WEEKDAYS, toISODate } from "@/lib/dateUtils";
import {
  createDeadline,
  deleteDeadline,
  updateDeadline,
} from "@/app/actions";

interface DeadlineFormPanelProps {
  userEmail: string;
  /** Defaults applied to NEW deadlines (from user settings). */
  defaultRecipients: string[];
  defaultLeadDays: number;
  /** null = creating a new deadline; otherwise editing this one. */
  deadline: Deadline | null;
  onClose: () => void;
}

export default function DeadlineFormPanel({
  userEmail,
  defaultRecipients,
  defaultLeadDays,
  deadline,
  onClose,
}: DeadlineFormPanelProps) {
  const isEditing = deadline !== null;

  const [title, setTitle] = useState(deadline?.title ?? "");
  const [deadlineDate, setDeadlineDate] = useState(
    deadline?.deadlineDate ?? toISODate(new Date())
  );
  const [recurrence, setRecurrence] = useState<RecurrenceType>(
    deadline?.recurrence ?? "none"
  );
  const [weekday, setWeekday] = useState(deadline?.weekday ?? 4); // Thursday
  const [dayOfMonth, setDayOfMonth] = useState(deadline?.dayOfMonth ?? 1);
  const [leadDays, setLeadDays] = useState(
    deadline?.leadDays ?? defaultLeadDays
  );
  const [urgency, setUrgency] = useState<Urgency>(
    deadline?.urgency ?? "regular"
  );
  // Recipients default to the user's own email for a new deadline.
  const [recipients, setRecipients] = useState<string[]>(
    deadline?.recipients ??
      (defaultRecipients.length > 0
        ? defaultRecipients
        : userEmail
        ? [userEmail]
        : [])
  );
  const [emailDraft, setEmailDraft] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addRecipient() {
    const value = emailDraft.trim();
    if (!value || recipients.includes(value)) return;
    setRecipients((prev) => [...prev, value]);
    setEmailDraft("");
  }

  function removeRecipient(email: string) {
    setRecipients((prev) => prev.filter((e) => e !== email));
  }

  function handleSave() {
    setError(null);

    // Fold any half-typed email into the list before saving.
    const pendingEmail = emailDraft.trim();
    const finalRecipients =
      pendingEmail && !recipients.includes(pendingEmail)
        ? [...recipients, pendingEmail]
        : recipients;

    if (!title.trim()) {
      setError("Please give your deadline a title.");
      return;
    }

    const values: DeadlineFormValues = {
      title,
      deadlineDate,
      recurrence,
      weekday,
      dayOfMonth,
      leadDays,
      urgency,
      recipients: finalRecipients,
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateDeadline(deadline.id, values)
        : await createDeadline(values);

      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  function handleDelete() {
    if (!deadline) return;
    if (!confirm(`Delete “${deadline.title}”?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteDeadline(deadline.id);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <button
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] transition"
      />

      {/* Slide-over panel */}
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditing ? "Edit deadline" : "New deadline"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {/* Title */}
          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Take the bins out"
              className={inputClass}
            />
          </Field>

          {/* Deadline date */}
          <Field label="Deadline date">
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          {/* Recurrence */}
          <Field label="Recurrence">
            <div className="flex flex-col gap-2">
              <SegmentedControl
                value={recurrence}
                onChange={(v) => setRecurrence(v as RecurrenceType)}
                options={[
                  { value: "none", label: "One-off" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                ]}
              />
              {recurrence === "weekly" && (
                <select
                  value={weekday}
                  onChange={(e) => setWeekday(Number(e.target.value))}
                  className={inputClass}
                >
                  {WEEKDAYS.map((wd, i) => (
                    <option key={wd} value={i}>
                      Every {wd}
                    </option>
                  ))}
                </select>
              )}
              {recurrence === "monthly" && (
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  className={inputClass}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Day {day} of every month
                    </option>
                  ))}
                </select>
              )}
            </div>
          </Field>

          {/* Lead time */}
          <Field
            label="Lead time"
            hint="Days before the deadline to start nagging."
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={30}
                value={leadDays}
                onChange={(e) => setLeadDays(Number(e.target.value))}
                className={`${inputClass} w-24`}
              />
              <span className="text-sm text-slate-500">
                day{leadDays === 1 ? "" : "s"} before
              </span>
            </div>
          </Field>

          {/* Urgency */}
          <Field label="Urgency">
            <SegmentedControl
              value={urgency}
              onChange={(v) => setUrgency(v as Urgency)}
              options={[
                { value: "regular", label: "Regular" },
                { value: "urgent", label: "🚨 Urgent" },
              ]}
            />
          </Field>

          {/* Recipients */}
          <Field label="Recipient emails" hint="Who should get the nag emails.">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRecipient();
                    }
                  }}
                  placeholder="name@example.com"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={addRecipient}
                  className="shrink-0 rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  Add
                </button>
              </div>
              {recipients.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {recipients.map((email) => (
                    <li
                      key={email}
                      className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 py-1 pl-3 pr-1.5 text-sm text-accent-700"
                    >
                      {email}
                      {email === userEmail && (
                        <span className="text-xs text-accent-400">you</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeRecipient(email)}
                        aria-label={`Remove ${email}`}
                        className="rounded-full p-0.5 text-accent-400 transition hover:bg-accent-100 hover:text-accent-700"
                      >
                        <CloseIcon size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <div>
            {isEditing && (
              <button
                onClick={handleDelete}
                disabled={pending}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={pending}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={pending}
              className="rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending
                ? "Saving…"
                : isEditing
                ? "Save changes"
                : "Create deadline"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent-400 focus:ring-2 focus:ring-accent-100";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {hint && <p className="mb-2 text-xs text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            "rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
            value === opt.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
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
