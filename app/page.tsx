import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEADLINE_SELECT,
  OCCURRENCE_SELECT,
  USER_SETTINGS_SELECT,
  rowToDeadline,
  rowToOccurrence,
  rowToUserSettings,
  type DeadlineRow,
  type OccurrenceRow,
  type UserSettingsRow,
} from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rows }, { data: occRows }, { data: settingsRow }] =
    await Promise.all([
      supabase
        .from("deadlines")
        .select(DEADLINE_SELECT)
        .order("deadline_date", { ascending: true }),
      supabase.from("occurrences").select(OCCURRENCE_SELECT),
      supabase
        .from("user_settings")
        .select(USER_SETTINGS_SELECT)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const deadlines = ((rows as DeadlineRow[] | null) ?? []).map(rowToDeadline);
  const occurrences = ((occRows as OccurrenceRow[] | null) ?? []).map(
    rowToOccurrence
  );

  const email = user.email ?? "";
  const settings = settingsRow
    ? rowToUserSettings(settingsRow as UserSettingsRow)
    : null;
  // No settings row yet → new deadlines default to the user's own email.
  const defaultRecipients = settings
    ? settings.defaultRecipients
    : email
    ? [email]
    : [];
  const defaultLeadDays = settings?.defaultLeadDays ?? 1;

  return (
    <Dashboard
      userEmail={email}
      deadlines={deadlines}
      occurrences={occurrences}
      defaultRecipients={defaultRecipients}
      defaultLeadDays={defaultLeadDays}
    />
  );
}
