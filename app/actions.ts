"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEADLINE_SELECT,
  rowToDeadline,
  type DeadlineFormValues,
  type DeadlineRow,
} from "@/lib/types";
import { sendDeadlineEmail } from "@/lib/email";
import { currentOccurrenceDate } from "@/lib/engine";
import { resolveOccurrenceById, type Resolution } from "@/lib/complete";

export interface ActionResult {
  error?: string;
}

/** Normalise form values into the columns the `deadlines` table expects. */
function toRow(values: DeadlineFormValues, userId: string) {
  return {
    user_id: userId,
    title: values.title.trim(),
    deadline_date: values.recurrence === "none" ? values.deadlineDate : null,
    recurrence: values.recurrence,
    weekday: values.recurrence === "weekly" ? values.weekday : null,
    day_of_month:
      values.recurrence === "monthly" && !values.lastDayOfMonth
        ? values.dayOfMonth
        : null,
    last_day_of_month:
      values.recurrence === "monthly" ? values.lastDayOfMonth : false,
    lead_days: values.leadDays,
    urgency: values.urgency,
  };
}

function cleanRecipients(recipients: string[]): string[] {
  const seen = new Set<string>();
  for (const r of recipients) {
    const email = r.trim();
    if (email) seen.add(email);
  }
  return Array.from(seen);
}

export async function createDeadline(
  values: DeadlineFormValues
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (!values.title.trim()) return { error: "Title is required." };

  const { data: inserted, error } = await supabase
    .from("deadlines")
    .insert(toRow(values, user.id))
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Could not create deadline." };
  }

  const recipients = cleanRecipients(values.recipients);
  if (recipients.length > 0) {
    const { error: recError } = await supabase
      .from("deadline_recipients")
      .insert(
        recipients.map((email) => ({ deadline_id: inserted.id, email }))
      );
    if (recError) return { error: recError.message };
  }

  revalidatePath("/");
  return {};
}

export async function updateDeadline(
  id: string,
  values: DeadlineFormValues
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (!values.title.trim()) return { error: "Title is required." };

  const { user_id: _ignored, ...updates } = toRow(values, user.id);
  void _ignored;

  const { error } = await supabase
    .from("deadlines")
    .update(updates)
    .eq("id", id);
  if (error) return { error: error.message };

  // Replace the recipient set wholesale — simplest correct approach.
  const { error: delError } = await supabase
    .from("deadline_recipients")
    .delete()
    .eq("deadline_id", id);
  if (delError) return { error: delError.message };

  const recipients = cleanRecipients(values.recipients);
  if (recipients.length > 0) {
    const { error: recError } = await supabase
      .from("deadline_recipients")
      .insert(recipients.map((email) => ({ deadline_id: id, email })));
    if (recError) return { error: recError.message };
  }

  revalidatePath("/");
  return {};
}

export async function deleteDeadline(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // ON DELETE CASCADE removes the recipients with the deadline.
  const { error } = await supabase.from("deadlines").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/");
  return {};
}

/**
 * Send a one-off TEST 'reminder' email to a deadline's recipients so the owner
 * can check delivery and appearance. This is not the real schedule — that
 * arrives in a later prompt. Protected: only the deadline's owner can trigger
 * it (enforced by auth + RLS on the lookup).
 */
export async function sendTestReminder(
  deadlineId: string
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // RLS guarantees this only returns a deadline the user owns.
  const { data: row, error } = await supabase
    .from("deadlines")
    .select(DEADLINE_SELECT)
    .eq("id", deadlineId)
    .single();

  if (error || !row) {
    return { error: "Deadline not found." };
  }

  const deadline = rowToDeadline(row as DeadlineRow);
  if (deadline.recipients.length === 0) {
    return { error: "Add at least one recipient first." };
  }

  // Ensure the current occurrence exists so the test email's "Mark as done"
  // button links to a real, working token.
  let doneToken: string | undefined;
  const occurrenceDate = currentOccurrenceDate(deadline);
  if (occurrenceDate) {
    const { data: occ } = await supabase
      .from("occurrences")
      .upsert(
        { deadline_id: deadlineId, occurrence_date: occurrenceDate },
        { onConflict: "deadline_id,occurrence_date" }
      )
      .select("done_token")
      .single();
    doneToken = (occ as { done_token: string } | null)?.done_token;
  }

  try {
    await sendDeadlineEmail({
      type: "reminder",
      deadline,
      recipients: deadline.recipients,
      doneToken,
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not send the email.",
    };
  }

  return {};
}

/**
 * Resolve the deadline's CURRENT occurrence (done or skipped), stopping further
 * reminders. Ensures the occurrence row exists (it may not if no reminder has
 * fired yet), then runs the shared resolve logic — the same code path as the
 * public /done and /skip links. 'done' emails recipients; 'skipped' does not.
 */
async function resolveCurrentOccurrence(
  deadlineId: string,
  resolution: Resolution
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: row, error: rowErr } = await supabase
    .from("deadlines")
    .select(DEADLINE_SELECT)
    .eq("id", deadlineId)
    .single();
  if (rowErr || !row) return { error: "Deadline not found." };

  const deadline = rowToDeadline(row as DeadlineRow);
  const occurrenceDate = currentOccurrenceDate(deadline);
  if (!occurrenceDate) return { error: "No current occurrence." };

  const { data: occ, error: occErr } = await supabase
    .from("occurrences")
    .upsert(
      { deadline_id: deadlineId, occurrence_date: occurrenceDate },
      { onConflict: "deadline_id,occurrence_date" }
    )
    .select("id")
    .single();
  if (occErr || !occ) {
    return { error: occErr?.message ?? "Could not update the occurrence." };
  }

  const result = await resolveOccurrenceById(
    supabase,
    (occ as { id: string }).id,
    resolution
  );
  if (result.status === "error") return { error: result.message };

  revalidatePath("/");
  return {};
}

/** Mark the current occurrence done (emails recipients the 'completed' note). */
export async function markOccurrenceDone(
  deadlineId: string
): Promise<ActionResult> {
  return resolveCurrentOccurrence(deadlineId, "done");
}

/** Skip the current occurrence this cycle (no email; future occurrences unaffected). */
export async function skipOccurrence(
  deadlineId: string
): Promise<ActionResult> {
  return resolveCurrentOccurrence(deadlineId, "skipped");
}

export interface UserSettingsValues {
  defaultRecipients: string[];
  defaultLeadDays: number;
}

/** Upsert the signed-in user's settings (defaults for new deadlines). */
export async function saveUserSettings(
  values: UserSettingsValues
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const recipients = cleanRecipients(values.defaultRecipients);
  const leadDays = Number.isFinite(values.defaultLeadDays)
    ? Math.max(0, Math.min(30, Math.round(values.defaultLeadDays)))
    : 1;

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      default_recipient_emails: recipients,
      default_lead_days: leadDays,
    },
    { onConflict: "user_id" }
  );
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/");
  return {};
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
