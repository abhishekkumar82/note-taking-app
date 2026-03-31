// server/services/habitEmailReminder.js
// ─────────────────────────────────────────────────────────────────────────────
// Runs two cron jobs:
//   1. 10:00 PM daily  → warn users about incomplete daily habits (2 hrs before midnight)
//   2. 11:59 PM daily  → congratulate users who completed ALL daily habits
//   3. Sunday 10:00 PM → warn about incomplete weekly habits
//   4. Sunday 11:59 PM → congratulate for completing all weekly habits
//
// Setup: npm install node-cron nodemailer
// In server/app.js add:  require("./services/habitEmailReminder");
// ─────────────────────────────────────────────────────────────────────────────

const cron     = require("node-cron");
const nodemailer = require("nodemailer");
const Habit    = require("../models/Habit");
const HabitLog = require("../models/HabitLog");
const User     = require("../models/User");

// ── Email transport ───────────────────────────────────────────────────────────
// Configure with your email provider. Using Gmail as example.
// Set these in your .env file:
//   EMAIL_USER=your@gmail.com
//   EMAIL_PASS=your_app_password   (use App Password for Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const toDateStr = (d) => d.toISOString().split("T")[0];
const todayStr  = () => toDateStr(new Date());

// ── Helper: get week start (Monday) ──────────────────────────────────────────
const getWeekStart = () => {
  const d   = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return toDateStr(new Date(d.setDate(diff)));
};

// ── Send email helper ─────────────────────────────────────────────────────────
const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from:    `"WriteUp App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[HabitReminder] Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`[HabitReminder] Email failed for ${to}:`, err.message);
  }
};

// ── Check habits for a user ───────────────────────────────────────────────────
const checkUserHabits = async (user, freq, date) => {
  const habits = await Habit.find({ user: user._id, freq });
  if (!habits.length) return { habits, completed: [], incomplete: [] };

  const logs      = await HabitLog.find({ user: user._id, date });
  const completed = habits.filter(h => logs.find(l => l.habitId === h._id.toString() && l.status === "completed"));
  const incomplete = habits.filter(h => !logs.find(l => l.habitId === h._id.toString() && l.status === "completed"));

  return { habits, completed, incomplete };
};

// ── Email templates ───────────────────────────────────────────────────────────
const warnTemplate = (name, incomplete, freq) => `
  <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border-radius:12px;background:#fff9db;border:1px solid #ffd43b">
    <h2 style="color:#e67700;margin:0 0 8px">⏰ ${freq === "weekly" ? "Weekly" : "Daily"} Habit Reminder</h2>
    <p style="color:#495057">Hey ${name}! You still have <strong>${incomplete.length} habit${incomplete.length > 1 ? "s" : ""}</strong> left to complete today:</p>
    <ul style="color:#495057;padding-left:20px">
      ${incomplete.map(h => `<li style="margin:4px 0">🎯 ${h.name}</li>`).join("")}
    </ul>
    <p style="color:#868e96;font-size:13px">You still have time! Don't break your streak 🔥</p>
    <a href="${process.env.APP_URL || "http://localhost:5173"}/dashboard" 
       style="display:inline-block;margin-top:12px;padding:10px 20px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
      Open WriteUp →
    </a>
  </div>
`;

const congratsTemplate = (name, completed, freq) => `
  <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border-radius:12px;background:#d3f9d8;border:1px solid #40c057">
    <h2 style="color:#2f9e44;margin:0 0 8px">🎉 Amazing! All ${freq === "weekly" ? "Weekly" : "Daily"} Habits Done!</h2>
    <p style="color:#495057">Hey ${name}! You crushed it today — every single habit completed! 🏆</p>
    <ul style="color:#495057;padding-left:20px">
      ${completed.map(h => `<li style="margin:4px 0">✅ ${h.name}</li>`).join("")}
    </ul>
    <p style="color:#868e96;font-size:13px">Consistency is key. Keep it up tomorrow! 💪</p>
    <a href="${process.env.APP_URL || "http://localhost:5173"}/dashboard"
       style="display:inline-block;margin-top:12px;padding:10px 20px;background:#40c057;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
      Open WriteUp →
    </a>
  </div>
`;

// ── Cron jobs ─────────────────────────────────────────────────────────────────

// 1. Daily warning — 10:00 PM every day (2 hrs before midnight)
cron.schedule("0 22 * * *", async () => {
  console.log("[HabitReminder] Running daily warning check…");
  try {
    const users = await User.find({});
    for (const user of users) {
      const { incomplete } = await checkUserHabits(user, "daily", todayStr());
      if (incomplete.length > 0) {
        await sendEmail(
          user.email || `${user.googleId}@placeholder.com`,
          `⏰ You still have ${incomplete.length} habit${incomplete.length > 1 ? "s" : ""} left today!`,
          warnTemplate(user.firstName, incomplete, "daily")
        );
      }
    }
  } catch (err) {
    console.error("[HabitReminder] Daily warn error:", err.message);
  }
});

// 2. Daily congrats — 11:59 PM every day
cron.schedule("59 23 * * *", async () => {
  console.log("[HabitReminder] Running daily congrats check…");
  try {
    const users = await User.find({});
    for (const user of users) {
      const { habits, completed, incomplete } = await checkUserHabits(user, "daily", todayStr());
      if (habits.length > 0 && incomplete.length === 0 && completed.length === habits.length) {
        await sendEmail(
          user.email || `${user.googleId}@placeholder.com`,
          "🎉 You completed ALL your habits today!",
          congratsTemplate(user.firstName, completed, "daily")
        );
      }
    }
  } catch (err) {
    console.error("[HabitReminder] Daily congrats error:", err.message);
  }
});

// 3. Weekly warning — Sunday 10:00 PM
cron.schedule("0 22 * * 0", async () => {
  console.log("[HabitReminder] Running weekly warning check…");
  try {
    const weekStart = getWeekStart();
    const users = await User.find({});
    for (const user of users) {
      const { incomplete } = await checkUserHabits(user, "weekly", weekStart);
      if (incomplete.length > 0) {
        await sendEmail(
          user.email || `${user.googleId}@placeholder.com`,
          `⏰ Weekly habits reminder — ${incomplete.length} left!`,
          warnTemplate(user.firstName, incomplete, "weekly")
        );
      }
    }
  } catch (err) {
    console.error("[HabitReminder] Weekly warn error:", err.message);
  }
});

// 4. Weekly congrats — Sunday 11:59 PM
cron.schedule("59 23 * * 0", async () => {
  console.log("[HabitReminder] Running weekly congrats check…");
  try {
    const weekStart = getWeekStart();
    const users = await User.find({});
    for (const user of users) {
      const { habits, completed, incomplete } = await checkUserHabits(user, "weekly", weekStart);
      if (habits.length > 0 && incomplete.length === 0 && completed.length === habits.length) {
        await sendEmail(
          user.email || `${user.googleId}@placeholder.com`,
          "🏆 You crushed all your weekly habits!",
          congratsTemplate(user.firstName, completed, "weekly")
        );
      }
    }
  } catch (err) {
    console.error("[HabitReminder] Weekly congrats error:", err.message);
  }
});

console.log("[HabitReminder] Cron jobs registered ✅");

module.exports = { sendEmail, checkUserHabits };
