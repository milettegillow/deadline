"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DeadlineFormValues } from "@/lib/types";

export interface ActionResult {
  error?: string;
}

/** Normalise form values into the columns the `deadlines` table expects. */
function toRow(values: DeadlineFormValues, userId: string) {
  return {
    user_id: userId,
    title: values.title.trim(),
    deadline_date: values.deadlineDate,
    recurrence: values.recurrence,
    weekday: values.recurrence === "weekly" ? values.weekday : null,
    day_of_month: values.recurrence === "monthly" ? values.dayOfMonth : null,
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

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
