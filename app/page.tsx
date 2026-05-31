import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rowToDeadline, type DeadlineRow } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("deadlines")
    .select(
      "id, title, deadline_date, recurrence, weekday, day_of_month, lead_days, urgency, created_at, deadline_recipients(id, email)"
    )
    .order("deadline_date", { ascending: true });

  const deadlines = ((rows as DeadlineRow[] | null) ?? []).map(rowToDeadline);

  return (
    <Dashboard userEmail={user.email ?? ""} deadlines={deadlines} />
  );
}
