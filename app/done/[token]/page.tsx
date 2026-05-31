import Link from "next/link";
import { completeByDoneToken, type CompleteResult } from "@/lib/complete";

export const dynamic = "force-dynamic";

export default async function DonePage({
  params,
}: {
  params: { token: string };
}) {
  const result = await completeByDoneToken(params.token);
  const view = present(result);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <span
          className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl shadow-sm ring-1 ring-slate-200"
          aria-hidden
        >
          {view.emoji}
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {view.heading}
        </h1>
        <p className="mt-2 text-slate-500">{view.body}</p>

        <Link
          href="/"
          className="mt-7 inline-flex items-center justify-center rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
        >
          Open Deadline
        </Link>
      </div>
    </main>
  );
}

function present(result: CompleteResult): {
  emoji: string;
  heading: string;
  body: string;
} {
  switch (result.status) {
    case "completed":
      return {
        emoji: "✅",
        heading: "Nice — all done!",
        body: `“${result.title}” is marked done. I'll stop the reminders.`,
      };
    case "already_done":
      return {
        emoji: "👍",
        heading: "Already done",
        body: `“${result.title}” was already marked done — nothing more to do.`,
      };
    case "not_found":
      return {
        emoji: "🤔",
        heading: "Link not found",
        body: "This link doesn't match anything. It may be old or mistyped.",
      };
    case "error":
      return {
        emoji: "⚠️",
        heading: "Something went wrong",
        body: "We couldn't mark this done just now. Please try again shortly.",
      };
  }
}
