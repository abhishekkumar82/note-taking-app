// server/queues/habitScheduler.js
// ─────────────────────────────────────────────────────────────────────────────
// Cron-driven job ENQUEUERS — replaces the old habitEmailReminder.js.
//
// The old file did:  cron fires → loop all users → send email (blocking)
// This file does:    cron fires → fetch user IDs → push N tiny jobs to Redis
//
// The event loop is never blocked because:
//   1. User.find() fetches only _id + email (lean projection, fast)
//   2. Each job is an independent Redis LPUSH — async, non-blocking
//   3. All heavy work (DB queries, SMTP) happens inside the Worker (separate)
//
// Schedules (IST — adjust TZ env var if needed):
//   "0 22 * * *"   daily warning    (10 PM every day)
//   "59 23 * * *"  daily congrats   (11:59 PM every day)
//   "0 22 * * 0"   weekly warning   (10 PM Sunday)
//   "59 23 * * 0"  weekly congrats  (11:59 PM Sunday)
// ─────────────────────────────────────────────────────────────────────────────

const cron        = require("node-cron");
const User        = require("../models/User");
const { habitQueue } = require("./habitQueue");

// ── Date helpers ──────────────────────────────────────────────────────────────
const toDateStr  = (d) => d.toISOString().split("T")[0];
const todayStr   = ()  => toDateStr(new Date());
const getWeekStart = () => {
  const d   = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return toDateStr(new Date(d.setDate(diff)));
};

// ── Enqueue helper — one job per user, non-blocking ───────────────────────────
// BullMQ's addBulk() sends all jobs in a single Redis pipeline → very fast
// even for thousands of users.
async function enqueueForAllUsers(type, extraData = {}) {
  // Lean projection: only _id needed — worker re-fetches full user by id.
  // This keeps the scheduler fast and the job payload tiny.
  const users = await User.find(
    { email: { $ne: null } },          // skip users with no email at all
    { _id: 1 }                         // lean projection
  ).lean();

  if (!users.length) {
    console.log(`[Scheduler] No users found for ${type}, skipping.`);
    return;
  }

  const jobs = users.map((u) => ({
    name: type,
    data: { type, userId: u._id.toString(), ...extraData },
    opts: {
      // Unique job ID per user per type per date prevents duplicates if the
      // scheduler fires twice (e.g. after a server restart mid-minute).
      jobId: `${type}:${u._id}:${extraData.date || extraData.weekStart}`,
    },
  }));

  await habitQueue.addBulk(jobs);
  console.log(`[Scheduler] Enqueued ${jobs.length} "${type}" jobs ✅`);
}

// ── Cron 1: Daily warning — 10:00 PM every day ───────────────────────────────
cron.schedule("0 22 * * *", async () => {
  console.log("[Scheduler] ⏰ daily-warn cron fired");
  try {
    await enqueueForAllUsers("daily-warn", { date: todayStr() });
  } catch (err) {
    console.error("[Scheduler] daily-warn enqueue error:", err.message);
  }
});

// ── Cron 2: Daily congrats — 11:59 PM every day ──────────────────────────────
cron.schedule("59 23 * * *", async () => {
  console.log("[Scheduler] 🎉 daily-congrats cron fired");
  try {
    await enqueueForAllUsers("daily-congrats", { date: todayStr() });
  } catch (err) {
    console.error("[Scheduler] daily-congrats enqueue error:", err.message);
  }
});

// ── Cron 3: Weekly warning — Sunday 10:00 PM ─────────────────────────────────
cron.schedule("0 22 * * 0", async () => {
  console.log("[Scheduler] ⏰ weekly-warn cron fired");
  try {
    await enqueueForAllUsers("weekly-warn", { weekStart: getWeekStart() });
  } catch (err) {
    console.error("[Scheduler] weekly-warn enqueue error:", err.message);
  }
});

// ── Cron 4: Weekly congrats — Sunday 11:59 PM ────────────────────────────────
cron.schedule("59 23 * * 0", async () => {
  console.log("[Scheduler] 🏆 weekly-congrats cron fired");
  try {
    await enqueueForAllUsers("weekly-congrats", { weekStart: getWeekStart() });
  } catch (err) {
    console.error("[Scheduler] weekly-congrats enqueue error:", err.message);
  }
});

console.log("[Scheduler] All cron schedules registered ✅");

module.exports = { enqueueForAllUsers }; // exported so you can trigger manually in tests