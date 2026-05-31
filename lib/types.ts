export type Recurrence =
  | { type: "none" }
  | { type: "weekly"; weekday: number } // 0 = Sunday … 6 = Saturday
  | { type: "monthly"; day: number }; // 1..31

export type Urgency = "regular" | "urgent";

export type DeadlineStatus = "pending" | "reminded" | "done";

export interface Deadline {
  id: string;
  title: string;
  /** ISO date string, YYYY-MM-DD */
  deadline: string;
  recurrence: Recurrence;
  /** Days before the deadline to start nagging. */
  leadDays: number;
  urgency: Urgency;
  status: DeadlineStatus;
  /** How many reminder emails have been sent so far. */
  remindersSent: number;
  recipients: string[];
}
