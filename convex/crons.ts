import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clear old events on the last day of each month at midnight Sydney time
// This runs at 14:00 UTC which is midnight AEST (Sydney time)
// or 1:00 AM AEDT during daylight saving time
// Using day 28 to ensure it runs in all months (including February)
crons.monthly(
  "clear old events monthly",
  { day: 28, hourUTC: 14, minuteUTC: 0 },
  internal.events.clearOldEvents
);

export default crons;

