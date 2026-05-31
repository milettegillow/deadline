import type { Deadline, DeadlineStatus } from "@/lib/types";
import { describeRecurrence, formatDateLabel } from "@/lib/dateUtils";

interface DeadlineListProps {
  deadlines: Deadline[];
}

export default function DeadlineList({ deadlines }: DeadlineListProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Your deadlines
      </h2>
      <ul className="flex flex-col gap-3">
        {deadlines.map((d) => (
          <li
            key={d.id}
            className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {d.urgency === "urgent" && (
                    <span title="Urgent" className="leading-none">
                      🚨
                    </span>
                  )}
                  <h3 className="truncate font-medium text-slate-900">
                    {d.title}
                  </h3>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDateLabel(d.deadline)}
                  <span className="px-1.5 text-slate-300">•</span>
                  {describeRecurrence(d.recurrence)}
                </p>
              </div>
              <StatusBadge status={d.status} remindersSent={d.remindersSent} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({
  status,
  remindersSent,
}: {
  status: DeadlineStatus;
  remindersSent: number;
}) {
  const styles: Record<DeadlineStatus, string> = {
    done: "bg-emerald-50 text-emerald-700",
    reminded: "bg-amber-50 text-amber-700",
    pending: "bg-slate-100 text-slate-600",
  };
  const label: Record<DeadlineStatus, string> = {
    done: "✅ Done",
    reminded: `${"❗".repeat(Math.min(Math.max(remindersSent, 1), 3))} Nagging`,
    pending: "Scheduled",
  };
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {label[status]}
    </span>
  );
}
