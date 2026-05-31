import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { rowToDeadline, type DeadlineRow } from "./types";
import { sendDeadlineEmail } from "./email";

/** How an occurrence can be resolved (stops further reminders either way). */
export type Resolution = "done" | "skipped";

export type ResolveResult =
  | { status: "done"; title: string }
  | { status: "skipped"; title: string }
  | { status: "already_done"; title: string }
  | { status: "already_skipped"; title: string }
  | { status: "not_found" }
  | { status: "error"; message: string };

// Occurrence + its parent deadline + recipients, in one query.
const OCC_WITH_DEADLINE =
  "id, status, deadlines(id, title, deadline_date, recurrence, weekday, day_of_month, lead_days, urgency, deadline_recipients(id, email))";

/**
 * The single source of truth for resolving an occurrence: flips a *pending*
 * occurrence to 'done' or 'skipped' (idempotently) and stops further reminders.
 * On a transition to 'done' it emails everyone the 'completed' note; 'skipped'
 * sends nothing. Works with either the user-session client (RLS) or the
 * service-role client, so the dashboard buttons and the public /done & /skip
 * links share exactly this logic.
 */
export async function resolveOccurrenceById(
  client: SupabaseClient,
  occurrenceId: string,
  resolution: Resolution
): Promise<ResolveResult> {
  const { data, error } = await client
    .from("occurrences")
    .select(OCC_WITH_DEADLINE)
    .eq("id", occurrenceId)
    .single();

  if (error || !data) return { status: "not_found" };

  const occ = data as unknown as {
    id: string;
    status: "pending" | "done" | "skipped";
    deadlines: DeadlineRow | null;
  };
  if (!occ.deadlines) return { status: "error", message: "Deadline missing." };

  const deadline = rowToDeadline(occ.deadlines);
  const title = deadline.title;

  if (occ.status === "done") return { status: "already_done", title };
  if (occ.status === "skipped") return { status: "already_skipped", title };

  const timestampColumn = resolution === "done" ? "done_at" : "skipped_at";

  // Only transition from 'pending' so concurrent taps can't double-resolve.
  const { data: updated, error: upErr } = await client
    .from("occurrences")
    .update({ status: resolution, [timestampColumn]: new Date().toISOString() })
    .eq("id", occurrenceId)
    .eq("status", "pending")
    .select("id");

  if (upErr) return { status: "error", message: upErr.message };

  if (!updated || updated.length === 0) {
    // Resolved by another request between our read and write — report which.
    const { data: cur } = await client
      .from("occurrences")
      .select("status")
      .eq("id", occurrenceId)
      .single();
    return cur?.status === "skipped"
      ? { status: "already_skipped", title }
      : { status: "already_done", title };
  }

  // Notify recipients only when completed — never on skip. A failed email must
  // not undo the resolution.
  if (resolution === "done") {
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
  }

  return { status: resolution, title };
}

/** Resolve an occurrence by its public done_token (no auth — uses admin). */
export async function resolveByDoneToken(
  token: string,
  resolution: Resolution
): Promise<ResolveResult> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("occurrences")
    .select("id")
    .eq("done_token", token)
    .maybeSingle();

  if (error || !data) return { status: "not_found" };
  return resolveOccurrenceById(admin, data.id as string, resolution);
}
