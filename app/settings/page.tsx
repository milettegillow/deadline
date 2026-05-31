import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  USER_SETTINGS_SELECT,
  rowToUserSettings,
  type UserSettingsRow,
} from "@/lib/types";
import SettingsForm from "@/components/SettingsForm";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = user.email ?? "";

  const { data: row } = await supabase
    .from("user_settings")
    .select(USER_SETTINGS_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  const settings = row ? rowToUserSettings(row as UserSettingsRow) : null;

  // No settings row yet → seed recipients with the user's own email.
  const initialRecipients = settings
    ? settings.defaultRecipients
    : email
    ? [email]
    : [];
  const initialLeadDays = settings?.defaultLeadDays ?? 1;

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[var(--background)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl leading-none" aria-hidden>
              🚩
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Deadline
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              ← Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-2 text-slate-500">
            Defaults applied to new deadlines.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SettingsForm
            userEmail={email}
            initialRecipients={initialRecipients}
            initialLeadDays={initialLeadDays}
          />
        </div>
      </div>
    </main>
  );
}
