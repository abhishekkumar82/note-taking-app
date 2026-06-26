// server/queues/habitEmailWorker.js
// ─────────────────────────────────────────────────────────────────────────────
// BullMQ Worker — processes "habit-email" jobs enqueued by habitScheduler.js
//
// Concurrency = 5: processes 5 user emails in parallel (safe because each job
// only touches its own user's data — no shared mutable state).
// Raise to 10-20 if your SMTP provider allows higher throughput.
//
// Retry behaviour (configured on the Queue in habitQueue.js):
//   attempt 1 fails → wait  5 s → retry
//   attempt 2 fails → wait 25 s → retry
//   attempt 3 fails → wait 125 s → move to "failed" list
//
// Each processor function returns early (no throw) if the user has no habits
// or the email condition isn't met — that counts as a SUCCESS, not a failure,
// so BullMQ won't waste retries on "nothing to do" cases.
// ─────────────────────────────────────────────────────────────────────────────

const { Worker } = require("bullmq");
const nodemailer  = require("nodemailer");
const User        = require("../models/User");
const Habit       = require("../models/Habit");
const HabitLog    = require("../models/HabitLog");
const { connection } = require("./habitQueue");

const APP_URL = process.env.APP_URL || "http://localhost:5173";

// ── Email transport ───────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,   // Gmail App Password — NOT your account password
  },
});

// ── Email templates ───────────────────────────────────────────────────────────
const warnTemplate = (name, incomplete, freq) => `
  <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;
              border-radius:12px;background:#fff9db;border:1px solid #ffd43b">
    <h2 style="color:#e67700;margin:0 0 8px">
      ⏰ ${freq === "weekly" ? "Weekly" : "Daily"} Habit Reminder
    </h2>
    <p style="color:#495057">
      Hey ${name}! You still have
      <strong>${incomplete.length} habit${incomplete.length > 1 ? "s" : ""}</strong>
      left to complete ${freq === "weekly" ? "this week" : "today"}:
    </p>
    <ul style="color:#495057;padding-left:20px">
      ${incomplete.map(h => `<li style="margin:4px 0">🎯 ${h.name}</li>`).join("")}
    </ul>
    <p style="color:#868e96;font-size:13px">You still have time! Don't break your streak 🔥</p>
    <a href="${APP_URL}/dashboard"
       style="display:inline-block;margin-top:12px;padding:10px 20px;
              background:#f59e0b;color:#fff;text-decoration:none;
              border-radius:8px;font-weight:600">
      Open WriteUp →
    </a>
  </div>`;

const congratsTemplate = (name, completed, freq) => `
  <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;
              border-radius:12px;background:#d3f9d8;border:1px solid #40c057">
    <h2 style="color:#2f9e44;margin:0 0 8px">
      🎉 Amazing! All ${freq === "weekly" ? "Weekly" : "Daily"} Habits Done!
    </h2>
    <p style="color:#495057">
      Hey ${name}! You crushed it ${freq === "weekly" ? "this week" : "today"}
      — every single habit completed! 🏆
    </p>
    <ul style="color:#495057;padding-left:20px">
      ${completed.map(h => `<li style="margin:4px 0">✅ ${h.name}</li>`).join("")}
    </ul>
    <p style="color:#868e96;font-size:13px">Consistency is key. Keep it up! 💪</p>
    <a href="${APP_URL}/dashboard"
       style="display:inline-block;margin-top:12px;padding:10px 20px;
              background:#40c057;color:#fff;text-decoration:none;
              border-radius:8px;font-weight:600">
      Open WriteUp →
    </a>
  </div>`;

// ── Helper: fetch habits + logs for one user ──────────────────────────────────
async function getUserHabitStatus(userId, freq, date) {
  const habits = await Habit.find({ user: userId, freq }).lean();
  if (!habits.length) return { habits: [], completed: [], incomplete: [] };

  const logs = await HabitLog.find({ user: userId, date }).lean();

  const completed  = habits.filter(h =>
    logs.some(l => l.habitId === h._id.toString() && l.status === "completed")
  );
  const incomplete = habits.filter(h =>
    !logs.some(l => l.habitId === h._id.toString() && l.status === "completed")
  );

  return { habits, completed, incomplete };
}

// ── Helper: send one email (throws on SMTP error → triggers BullMQ retry) ────
async function sendEmail(to, subject, html) {
  await transporter.sendMail({
    from:    `"WriteUp" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
  console.log(`[Worker] ✉️  sent "${subject}" → ${to}`);
}

// ── Job processor ─────────────────────────────────────────────────────────────
// BullMQ calls this function once per job.
// Throwing from here marks the job as failed and triggers the retry backoff.
// Returning normally (even with no email sent) marks it completed.
async function processJob(job) {
  const { type, userId, date, weekStart } = job.data;

  // Re-fetch user inside the worker — the job payload only carries the ID
  // (keeps payloads tiny and avoids stale data from enqueue time).
  const user = await User.findById(userId).select("firstName email googleId").lean();

  if (!user) {
    // User deleted between enqueue and processing — treat as done, no retry needed.
    console.log(`[Worker] User ${userId} not found, skipping job ${job.id}`);
    return { skipped: true, reason: "user_not_found" };
  }

  // Resolve the best available email address
  const emailTo = user.email || (user.googleId ? `${user.googleId}@gmail-placeholder.invalid` : null);
  if (!emailTo || emailTo.includes("placeholder")) {
    console.log(`[Worker] No valid email for user ${userId}, skipping`);
    return { skipped: true, reason: "no_email" };
  }

  // ── Route by job type ────────────────────────────────────────────────────
  switch (type) {

    case "daily-warn": {
      const { incomplete } = await getUserHabitStatus(userId, "daily", date);
      if (!incomplete.length) {
        return { skipped: true, reason: "all_done" }; // completed everything — no warning needed
      }
      await sendEmail(
        emailTo,
        `⏰ You still have ${incomplete.length} habit${incomplete.length > 1 ? "s" : ""} left today!`,
        warnTemplate(user.firstName, incomplete, "daily")
      );
      return { sent: true, type, incomplete: incomplete.length };
    }

    case "daily-congrats": {
      const { habits, completed, incomplete } = await getUserHabitStatus(userId, "daily", date);
      if (!habits.length || incomplete.length > 0) {
        return { skipped: true, reason: incomplete.length > 0 ? "not_all_done" : "no_habits" };
      }
      await sendEmail(
        emailTo,
        "🎉 You completed ALL your habits today!",
        congratsTemplate(user.firstName, completed, "daily")
      );
      return { sent: true, type, completed: completed.length };
    }

    case "weekly-warn": {
      const { incomplete } = await getUserHabitStatus(userId, "weekly", weekStart);
      if (!incomplete.length) {
        return { skipped: true, reason: "all_done" };
      }
      await sendEmail(
        emailTo,
        `⏰ Weekly habits reminder — ${incomplete.length} left!`,
        warnTemplate(user.firstName, incomplete, "weekly")
      );
      return { sent: true, type, incomplete: incomplete.length };
    }

    case "weekly-congrats": {
      const { habits, completed, incomplete } = await getUserHabitStatus(userId, "weekly", weekStart);
      if (!habits.length || incomplete.length > 0) {
        return { skipped: true, reason: incomplete.length > 0 ? "not_all_done" : "no_habits" };
      }
      await sendEmail(
        emailTo,
        "🏆 You crushed all your weekly habits!",
        congratsTemplate(user.firstName, completed, "weekly")
      );
      return { sent: true, type, completed: completed.length };
    }

    default:
      console.warn(`[Worker] Unknown job type: ${type}`);
      return { skipped: true, reason: "unknown_type" };
  }
}

// ── Create the Worker ─────────────────────────────────────────────────────────
const worker = new Worker("habit-email", processJob, {
  connection,
  concurrency: 5,   // 5 user emails processed in parallel — safe, no shared state
});

// ── Worker lifecycle events ───────────────────────────────────────────────────
worker.on("completed", (job, result) => {
  if (result?.sent) {
    console.log(`[Worker] ✅ job ${job.id} (${job.data.type}) completed — email sent`);
  } else {
    console.log(`[Worker] ⏭  job ${job.id} (${job.data.type}) skipped — ${result?.reason}`);
  }
});

worker.on("failed", (job, err) => {
  console.error(
    `[Worker] ❌ job ${job?.id} (${job?.data?.type}) failed ` +
    `[attempt ${job?.attemptsMade}/${job?.opts?.attempts}]: ${err.message}`
  );
});

worker.on("error", (err) => {
  // Worker-level errors (e.g. Redis disconnect) — logged but don't crash the process
  console.error("[Worker] worker error:", err.message);
});

console.log("[Worker] habit-email worker started (concurrency=5) ✅");

module.exports = worker; // exported so app.js can call worker.close() on shutdown