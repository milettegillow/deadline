import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEADLINE_SELECT,
  rowToDeadline,
  rowToOccurrence,
  type DeadlineRow,
  type OccurrenceRow,
} from "@/lib/types";
import { sendDeadlineEmail } from "@/lib/email";
import {
  TIMEZONE,
  currentOccurrenceDate,
  isPastOccurrence,
  stageTimes,
  type StageColumn,
} from "@/lib/engine";

// Always run on demand — never cached or statically evaluated.
export const dynamic = "force-dynamic";

/** Accept the secret via `?secret=` or `Authorization: Bearer <secret>`. */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;

  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() === secret;
  }
  return false;
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = DateTime.now();

  const { data: rows, error } = await admin
    .from("deadlines")
    .select(DEADLINE_SELECT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const deadlineRows = (rows ?? []) as DeadlineRow[];
  const results: Record<string, unknown>[] = [];
  let sentCount = 0;

  for (const row of deadlineRows) {
    const deadline = rowToDeadline(row);

    const occDate = currentOccurrenceDate(deadline, now);
    if (!occDate) {
      results.push({ deadline: deadline.id, action: "no-occurrence" });
      continue;
    }

    // Don't blast stale emails for occurrences whose day has fully passed.
    if (isPastOccurrence(occDate, now)) {
      results.push({
        deadline: deadline.id,
        occurrenceDate: occDate,
        action: "past",
      });
      continue;
    }

    // Create the occurrence row if it doesn't exist yet, then read its state.
    const { data: occRow, error: occErr } = await admin
      .from("occurrences")
      .upsert(
        { deadline_id: deadline.id, occurrence_date: occDate },
        { onConflict: "deadline_id,occurrence_date" }
      )
      .select(
        "id, deadline_id, occurrence_date, status, reminder_sent_at, follow_up_sent_at, last_chance_sent_at, due_today_sent_at, done_at, created_at"
      )
      .single();

    if (occErr || !occRow) {
      results.push({
        deadline: deadline.id,
        occurrenceDate: occDate,
        action: "occurrence-error",
        error: occErr?.message,
      });
      continue;
    }

    const occ = rowToOccurrence(occRow as OccurrenceRow);

    if (occ.status === "done") {
      results.push({
        deadline: deadline.id,
        occurrenceDate: occDate,
        action: "done",
      });
      continue;
    }

    const sentAt: Record<StageColumn, string | null> = {
      reminder_sent_at: occ.reminderSentAt,
      follow_up_sent_at: occ.followUpSentAt,
      last_chance_sent_at: occ.lastChanceSentAt,
      due_today_sent_at: occ.dueTodaySentAt,
    };

    // The earliest stage that is due (time passed) and not yet sent.
    const due = stageTimes(occDate, deadline.leadDays)
      .filter((s) => s.at <= now && !sentAt[s.column])
      .sort((a, b) => a.at.toMillis() - b.at.toMillis());

    if (due.length === 0) {
      results.push({
        deadline: deadline.id,
        occurrenceDate: occDate,
        action: "nothing-due",
      });
      continue;
    }

    const stage = due[0];

    if (deadline.recipients.length === 0) {
      results.push({
        deadline: deadline.id,
        occurrenceDate: occDate,
        action: "no-recipients",
        stage: stage.key,
      });
      continue;
    }

    try {
      await sendDeadlineEmail({
        type: stage.key,
        deadline,
        recipients: deadline.recipients,
      });
    } catch (e) {
      results.push({
        deadline: deadline.id,
        occurrenceDate: occDate,
        action: "send-error",
        stage: stage.key,
        error: e instanceof Error ? e.message : "unknown",
      });
      continue;
    }

    await admin
      .from("occurrences")
      .update({ [stage.column]: now.toISO() })
      .eq("id", occ.id);

    sentCount++;
    results.push({
      deadline: deadline.id,
      occurrenceDate: occDate,
      action: "sent",
      stage: stage.key,
    });
  }

  return NextResponse.json({
    now: now.toISO(),
    timezone: TIMEZONE,
    evaluated: deadlineRows.length,
    sent: sentCount,
    results,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
