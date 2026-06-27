require('dotenv').config();
const http = require('http');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const connectDB = require('./config/database');
require('./config/passport');
const app = express();
const PORT = process.env.PORT || 9090;

// ── BullMQ habit email queue ──────────────────────────────────────────────────
// ⚠️ DISABLED — these files don't exist yet in this project. Re-enable once
// queues/habitScheduler.js, queues/habitEmailWorker.js, and
// queues/habitQueueAdmin.js are actually built (Feature #9 from the roadmap).
// require("./queues/habitScheduler");    // registers cron enqueue jobs
// require("./queues/habitEmailWorker");  // starts the background worker

// ── Bull Board admin UI (remove or password-protect in production) ────────────
// const { createAdminRouter } = require("./queues/habitQueueAdmin");
// app.use("/admin/queues", createAdminRouter());
// visit http://localhost:9090/admin/queues to see the queue dashboard

// Connect to Database
connectDB();
require("./utils/cronJobs");

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'writeup-session-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 24 * 7 * 1000 }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
const authRouter           = require("./routes/auth");
const dashboardRouter      = require("./routes/dashboard");
const habitRouter          = require("./routes/habits");
const diaryRouter          = require("./routes/diary");
const paymentRouter        = require("./routes/payment");
const collabRouter         = require("./routes/collab");
const semanticSearchRouter = require("./routes/semanticSearch");
const initCollabSocket     = require("./collabSocket");

// Google OAuth routes  →  /auth/google,  /auth/google/callback,  /auth/logout
app.use("/auth", authRouter);
// API auth routes  →  /api/auth/send-otp,  /api/auth/verify-otp,
//                     /api/auth/register,  /api/auth/login,  /api/auth/me
app.use("/api/auth", authRouter);

// Your existing API routes
app.use("/api/dashboard", dashboardRouter);
app.use("/api/habits",    habitRouter);
app.use("/api/diary",     diaryRouter);
app.use("/api/payment",   paymentRouter);
app.use("/api/collab",    collabRouter);                 // ⭐ ADDED — collab start/resolve/revoke
app.use("/api/search",    semanticSearchRouter);

// ⭐ REPLACED app.listen(...) WITH http server + Socket.io wiring ──────────────
// We wrap the Express app in a raw http.Server so Socket.io can attach to the
// SAME port — no second server/port needed.
const server = http.createServer(app);
initCollabSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Realtime collaboration ready at ws://localhost:${PORT}/socket.io/collab`);
});

module.exports = app;