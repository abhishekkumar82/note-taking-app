require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const connectDB = require('./config/database');
const habitsRouter = require('./routes/habits');
require('./config/passport');   // ⭐ ADD THIS LINE
const { isLoggedIn } = require('./middleware/checkAuth');
const diaryRoutes = require("./routes/diary");
const app = express();
const PORT = process.env.PORT ;
const authRoutes = require("./routes/auth");
const paymentRouter=require("./routes/payment");
require("./services/habitEmailReminder");
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
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 24 * 7 * 1000 }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
// src/App.jsx (or wherever your routes are)
const authRouter      = require("./routes/auth");
const dashboardRouter = require("./routes/dashboard");   // your existing routes
const habitRouter     = require("./routes/habits");        // your existing routes
const diaryRouter     = require("./routes/diary"); 
// Google OAuth routes  →  /auth/google,  /auth/google/callback,  /auth/logout
app.use("/auth", authRouter);
// API auth routes  →  /api/auth/send-otp,  /api/auth/verify-otp,
//                     /api/auth/register,  /api/auth/login,  /api/auth/me
app.use("/api/auth", authRouter);

// Your existing API routes
app.use("/api/dashboard", dashboardRouter);
app.use("/api/habits",    habitRouter);
app.use("/api/diary",     diaryRouter);
app.use("/api/payment", paymentRouter)
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;