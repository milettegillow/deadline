import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { rowToDeadline, type DeadlineRow } from "./types";
import { sendDeadlineEmail } from "./email";

export type CompleteResult =
  | { status: "completed"; title: string }
  | { status: "already_done"; title: string }
  | { status: "not_found" }
  | { status: "error"; message: string };

// Occurrence + its parent deadline + recipients, in one query.
const OCC_WITH_DEADLINE =
  "id, status, deadlines(id, title, deadline_date, recurrence, weekday, day_of_month, lead_days, urgency, deadline_recipients(id, email))";

/**
 * The single source of truth for completing an occurrence: flips it to done,
 * idempotently, and (only on the transition to done) emails everyone the
 * 'completed' note. Works with either the user-session client (RLS) or the
 * service-role client, so the dashboard button and the public /done link share
 * exactly this logic.
 */
export async function completeOccurrenceById(
  client: SupabaseClient,
  occurrenceId: string
): Promise<CompleteResult> {
  const { data, error } = await client
    .from("occurrences")
    .select(OCC_WITH_DEADLINE)
    .eq("id", occurrenceId)
    .single();

  if (error || !data) return { status: "not_found" };

  const occ = data as unknown as {
    id: string;
    status: "pending" | "done";
    deadlines: DeadlineRow | null;
  };
  if (!occ.deadlines) return { status: "error", message: "Deadline missing." };

  const deadline = rowToDeadline(occ.deadlines);

  if (occ.status === "done") {
    return { status: "already_done", title: deadline.title };
  }

  // Mark done, guarding on status so concurrent taps don't double-send.
  const { data: updated, error: upErr } = await client
    .from("occurrences")
    .update({ status: "done", done_at: new Date().toISOString() })
    .eq("id", occurrenceId)
    .neq("status", "done")
    .select("id");

  if (upErr) return { status: "error", message: upErr.message };
  if (!updated || updated.length === 0) {
    // Another request flipped it between our read and write — don't re-send.
    return { status: "already_done", title: deadline.title };
  }

  // Notify all recipients. A failed email must not undo the "done" state.
  try {
    if (deadline.recipients.length > 0) {
      await sendDeadlineEmail({
        type: "completed",
        deadline,
        recipients: deadline.recipients,
      });
    }
  } catch {
    // swallow — the occurrence is already marked done
  }

  return { status: "completed", title: deadline.title };
}

/** Complete an occurrence by its public done_token (no auth — uses admin). */
export async function completeByDoneToken(
  token: string
): Promise<CompleteResult> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("occurrences")
    .select("id")
    .eq("done_token", token)
    .maybeSingle();

  if (error || !data) return { status: "not_found" };
  return completeOccurrenceById(admin, data.id as string);
}
