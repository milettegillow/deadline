"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 text-5xl leading-none" aria-hidden>
            🚩
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Deadline
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in to manage your deadlines.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {status === "sent" ? (
            <div className="text-center">
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-2xl">
                📬
              </span>
              <h2 className="text-lg font-semibold text-slate-900">
                Check your email
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                We sent a magic link to{" "}
                <span className="font-medium text-slate-700">{email}</span>.
                Click it to sign in.
              </p>
              <button
                onClick={() => {
                  setStatus("idle");
                  setEmail("");
                }}
                className="mt-5 text-sm font-medium text-accent-600 transition hover:text-accent-700"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Send magic link"}
              </button>

              <p className="text-center text-xs text-slate-400">
                We&apos;ll email you a link — no password needed.
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
