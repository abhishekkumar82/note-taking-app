// server/queues/habitQueue.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the BullMQ queue and Redis connection.
// All other files import { habitQueue, connection } from here.
//
// Queue name:  "habit-email"
// Job shapes:
//   { type: "daily-warn"    , userId, date }
//   { type: "daily-congrats", userId, date }
//   { type: "weekly-warn"   , userId, weekStart }
//   { type: "weekly-congrats", userId, weekStart }
//
// Default job options (applied to every enqueue unless overridden):
//   attempts : 3          — retry up to 3 times on failure
//   backoff  : exponential starting at 5 s — 5s → 25s → 125s
//   removeOnComplete: { count: 200 }  — keep last 200 completed jobs for the UI
//   removeOnFail    : { count: 500 }  — keep last 500 failed jobs for debugging
// ─────────────────────────────────────────────────────────────────────────────

const { Queue } = require("bullmq");
const IORedis   = require("ioredis");

// ── Redis connection ──────────────────────────────────────────────────────────
// maxRetriesPerRequest: null is REQUIRED by BullMQ — it manages retries itself.
const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck:     false,
});

connection.on("connect", () => console.log("[Redis] connected ✅"));
connection.on("error",  (e) => console.error("[Redis] error:", e.message));

// ── Queue ─────────────────────────────────────────────────────────────────────
const habitQueue = new Queue("habit-email", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type:  "exponential",
      delay: 5000,          // first retry after 5 s, then 25 s, then 125 s
    },
    removeOnComplete: { count: 200 },
    removeOnFail:     { count: 500 },
  },
});

module.exports = { habitQueue, connection };