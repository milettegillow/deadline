import type { Deadline } from "./types";
import { addDays, nextWeekday, toISODate } from "./dateUtils";

// Dates are computed relative to today so the mock deadlines always land on the
// currently-visible month and "today" highlighting makes sense in the demo.
const today = new Date();

// "Take the bins out" — next Thursday (weekday 4). Two reminders already sent,
// so the nag day (Wednesday) shows ❗❗ and the deadline day (Thursday) shows 🚩.
const binsThursday = toISODate(nextWeekday(4, today));

// "Order medication" — a couple of days ago, already marked done → ✅.
const medsDate = toISODate(addDays(today, -2));

// Urgent: "Submit tax return" — in a few days, three reminders sent → ❗❗❗,
// plus a 🚨 indicator on the deadline day and in the list.
const taxDate = toISODate(addDays(today, 5));

export const mockDeadlines: Deadline[] = [
  {
    id: "bins",
    title: "Take the bins out",
    deadline: binsThursday,
    recurrence: { type: "weekly", weekday: 4 },
    leadDays: 1,
    urgency: "regular",
    status: "reminded",
    remindersSent: 2,
    recipients: ["me@example.com"],
  },
  {
    id: "meds",
    title: "Order medication",
    deadline: medsDate,
    recurrence: { type: "monthly", day: 1 },
    leadDays: 1,
    urgency: "regular",
    status: "done",
    remindersSent: 1,
    recipients: ["me@example.com", "carer@example.com"],
  },
  {
    id: "tax",
    title: "Submit tax return",
    deadline: taxDate,
    recurrence: { type: "none" },
    leadDays: 2,
    urgency: "urgent",
    status: "reminded",
    remindersSent: 3,
    recipients: ["me@example.com", "accountant@example.com"],
  },
];
