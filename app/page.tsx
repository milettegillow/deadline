import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEADLINE_SELECT,
  OCCURRENCE_SELECT,
  rowToDeadline,
  rowToOccurrence,
  type DeadlineRow,
  type OccurrenceRow,
} from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rows }, { data: occRows }] = await Promise.all([
    supabase
      .from("deadlines")
      .select(DEADLINE_SELECT)
      .order("deadline_date", { ascending: true }),
    supabase.from("occurrences").select(OCCURRENCE_SELECT),
  ]);

  const deadlines = ((rows as DeadlineRow[] | null) ?? []).map(rowToDeadline);
  const occurrences = ((occRows as OccurrenceRow[] | null) ?? []).map(
    rowToOccurrence
  );

  return (
    <Dashboard
      userEmail={user.email ?? ""}
      deadlines={deadlines}
      occurrences={occurrences}
    />
  );
}
