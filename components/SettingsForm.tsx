"use client";

import { useState, useTransition } from "react";
import { saveUserSettings } from "@/app/actions";

interface SettingsFormProps {
  userEmail: string;
  initialRecipients: string[];
  initialLeadDays: number;
}

export default function SettingsForm({
  userEmail,
  initialRecipients,
  initialLeadDays,
}: SettingsFormProps) {
  const [recipients, setRecipients] = useState<string[]>(initialRecipients);
  const [leadDays, setLeadDays] = useState(initialLeadDays);
  const [emailDraft, setEmailDraft] = useState("");
  const [status, setStatus] = useState<
    { kind: "ok" | "error"; message: string } | null
  >(null);
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
    setStatus(null);

    // Fold any half-typed email into the list before saving.
    const pendingEmail = emailDraft.trim();
    const finalRecipients =
      pendingEmail && !recipients.includes(pendingEmail)
        ? [...recipients, pendingEmail]
        : recipients;

    startTransition(async () => {
      const result = await saveUserSettings({
        defaultRecipients: finalRecipients,
        defaultLeadDays: leadDays,
      });
      if (result.error) {
        setStatus({ kind: "error", message: result.error });
      } else {
        setRecipients(finalRecipients);
        setEmailDraft("");
        setStatus({ kind: "ok", message: "Settings saved." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Account */}
      <Field label="Account">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
          Signed in as{" "}
          <span className="font-medium text-slate-900">{userEmail}</span>
        </div>
      </Field>

      {/* Default recipients */}
      <Field
        label="Default recipients"
        hint="Auto-added to the recipient list when you create a new deadline."
      >
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
          {recipients.length > 0 ? (
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
          ) : (
            <p className="text-xs text-slate-400">
              No default recipients — new deadlines will start with an empty
              list.
            </p>
          )}
        </div>
      </Field>

      {/* Default lead time */}
      <Field
        label="Default lead time"
        hint="Days before a deadline to start nagging, for new deadlines."
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

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={pending}
          className="rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {status && (
          <span
            className={
              status.kind === "ok"
                ? "text-sm text-emerald-600"
                : "text-sm text-red-600"
            }
          >
            {status.message}
          </span>
        )}
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
