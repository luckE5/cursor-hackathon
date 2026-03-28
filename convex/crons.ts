import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "meeting reminder emails",
  { minutes: 20 },
  internal.reminders.tickMeetingReminders,
  {},
);

export default crons;
