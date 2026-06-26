// server/utils/cronJobs.js
// ─────────────────────────────────────────────────────────────────────────────
// Cron jobs:
//   1. Midnight daily  — hard-delete trash notes older than 7 days
//   2. Every minute    — FEATURE 2: smart reminder notifications
//                        • Max 5 browser/email pushes per reminder (no spam)
//                        • One email warning when ≤10 minutes remain
// ─────────────────────────────────────────────────────────────────────────────

const cron = require("node-cron");
const Note = require("../models/Notes");
const User = require("../models/User");
const { sendReminderWarningEmail } = require("./sendEmail");

const MAX_NOTIFY = 5; // FEATURE 2: hard cap on how many times we push a reminder

// ── 1. Trash cleanup — midnight every day ─────────────────────────────────────
cron.schedule("0 0 * * *", async () => {
  console.log("🧹 Running trash cleanup…");
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const result = await Note.deleteMany({
      isDeleted: true,
      deletedAt: { $lte: sevenDaysAgo },
    });
    console.log(`  Deleted ${result.deletedCount} old notes`);
  } catch (err) {
    console.error("Trash cleanup failed:", err.message);
  }
});

// ── 2. Smart reminder check — every minute ────────────────────────────────────
// Finds notes whose reminder time has passed but haven't hit the notify cap,
// OR notes with ≤10 min left that haven't had their warning email sent yet.
cron.schedule("* * * * *", async () => {
  const now    = new Date();
  const in10m  = new Date(now.getTime() + 10 * 60 * 1000);

  try {
    // ── 2a. 10-minute email warning ───────────────────────────────────────────
    // Find notes with reminder between now and +10 min, warning email not sent yet
    const warningNotes = await Note.find({
      isDeleted:        false,
      isDiary:          { $ne: true },
      reminder:         { $gt: now, $lte: in10m },
      reminderEmailSent: false,
    }).populate("user");

    for (const note of warningNotes) {
      const user = note.user;
      if (!user?.email) continue;

      try {
        await sendReminderWarningEmail(user.email, user.firstName, note.title, note.reminder);
        note.reminderEmailSent = true;
        await note.save();
        console.log(`📧 10-min warning email sent → ${user.email} for "${note.title}"`);
      } catch (e) {
        console.error(`  Email failed for ${user.email}:`, e.message);
      }
    }

    // ── 2b. Overdue reminder notification cap ─────────────────────────────────
    // Find notes whose reminder has passed and notifyCount < MAX_NOTIFY
    const overdueNotes = await Note.find({
      isDeleted:           false,
      isDiary:             { $ne: true },
      reminder:            { $lte: now },
      reminded:            false,
      reminderNotifyCount: { $lt: MAX_NOTIFY },
    });

    for (const note of overdueNotes) {
      // Increment counter and check if we've hit the cap
      note.reminderNotifyCount = (note.reminderNotifyCount || 0) + 1;

      if (note.reminderNotifyCount >= MAX_NOTIFY) {
        // Cap reached — mark as fully reminded, stop future notifications
        note.reminded = true;
        console.log(`🔕 Reminder cap reached for note "${note.title}" — silenced`);
      }

      await note.save();
      // The browser notification itself is triggered client-side (Dashboard.jsx).
      // This server record is the source of truth that prevents re-firing.
    }

  } catch (err) {
    console.error("Reminder cron error:", err.message);
  }
});

console.log("⏰ Cron jobs registered: trash cleanup + smart reminders");
