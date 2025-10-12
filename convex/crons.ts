import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clear events every Sunday at midnight (00:00)
crons.weekly(
  "clear weekly events",
  { dayOfWeek: "sunday", hourUTC: 14, minuteUTC: 0 }, // 14:00 UTC = 00:00 AEST (Sydney time)
  internal.events.clearWeeklyEvents
);

export default crons;

