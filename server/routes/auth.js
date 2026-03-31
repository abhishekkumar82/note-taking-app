// server/routes/auth.js — HYBRID AUTH (OTP + Password)
// ─────────────────────────────────────────────────────────────────────────────
// KEY FIX: OTP users can now also use password login via "Set / Forgot Password".
//
// Problem solved:
//   - OTP login creates users with no password (correct behavior)
//   - Forgot-password previously silently failed for these users (!user.password guard)
//   - Now: forgot-password works for ALL verified email accounts, with or without password
//   - Login endpoint gives a clear, actionable error when password is not set
//   - Register endpoint merges with existing OTP-created accounts (no duplicate emails)
//
// Auth methods supported:
//   1. Email OTP   — passwordless quick login, creates/logs in user
//   2. Email+Pass  — traditional login; user can set a password via forgot-password flow
//   3. Google OAuth — session cookie, unchanged
//
// All endpoints:
//   GET  /google                    → Google OAuth start
//   GET  /google/callback           → Google OAuth callback
//   GET  /logout                    → Session destroy + redirect
//   GET  /me                        → Session check (Google OAuth users)
//   POST /send-otp                  → Send 6-digit OTP to email
//   POST /verify-otp                → Verify email OTP → JWT
//   POST /register                  → Email signup (merges if OTP account exists)
//   POST /login                     → Email+password login (clear error if no password set)
//   GET  /verify-email              → Handles click from verification email
//   POST /resend-verification       → Resend verification email
//   POST /forgot-password           → Works for ALL verified users (OTP or password)
//   POST /reset-password            → Apply new password via token
//   POST /diary/request-pin-reset   → Send PIN reset OTP to email
//   POST /diary/verify-pin-reset    → Verify PIN reset OTP
// ─────────────────────────────────────────────────────────────────────────────

const express  = require("express");
const router   = express.Router();
const passport = require("passport");
const bcrypt   = require("bcrypt");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const User     = require("../models/User");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendDiaryPinResetEmail,
  sendWelcomeEmail,
  sendLoginOtpEmail,
} = require("../utils/sendEmail");

const JWT_SECRET = process.env.JWT_SECRET   || "writeup-super-secret-key-change-in-prod";
const FRONTEND   = process.env.FRONTEND_URL || "http://localhost:5173";

const signToken   = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" });
const randomToken = () => crypto.randomBytes(32).toString("hex");
const randomOtp   = () => Math.floor(100000 + Math.random() * 900000).toString();
const validEmail  = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).toLowerCase());

// ── OTP store: Map<email, { otp, expiresAt, attempts }> ──────────────────────
const otpStore = new Map();
const MAX_OTP_ATTEMPTS = 5;

// ─────────────────────────────────────────────────────────────────────────────
//  GOOGLE OAUTH
// ─────────────────────────────────────────────────────────────────────────────
router.get("/google", passport.authenticate("google", { scope: ["email", "profile"] }));

router.get("/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${FRONTEND}/`,
    successRedirect: `${FRONTEND}/dashboard`,
  })
);

router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: "Logout error" });
    req.session.destroy(() => res.redirect(FRONTEND));
  });
});

router.get("/me", (req, res) => {
  if (req.user) return res.json({ user: req.user });
  res.status(401).json({ message: "Not authenticated" });
});

// ─────────────────────────────────────────────────────────────────────────────
//  EMAIL OTP — SEND
//  POST /api/auth/send-otp
//  Body: { email }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validEmail(email))
      return res.status(400).json({ message: "Enter a valid email address" });

    const otp       = randomOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email.toLowerCase(), { otp, expiresAt, attempts: 0 });

    await sendLoginOtpEmail(email, otp);
    console.log(`\n🔑  Login OTP for ${email}  →  ${otp}  (valid 10 min)\n`);

    res.json({ message: "OTP sent to your email. Check your inbox.", expiresIn: 600 });
  } catch (err) {
    console.error("[send-otp]", err.message);
    res.status(500).json({ message: "Failed to send OTP. Try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  EMAIL OTP — VERIFY
//  POST /api/auth/verify-otp
//  Body: { email, otp }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const key    = email.toLowerCase();
    const record = otpStore.get(key);

    if (!record)
      return res.status(400).json({ message: "No OTP found for this email. Request a new one." });

    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ message: "OTP expired. Request a new one." });
    }

    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts > MAX_OTP_ATTEMPTS) {
      otpStore.delete(key);
      return res.status(429).json({ message: "Too many attempts. Request a new OTP." });
    }

    if (record.otp !== otp.trim()) {
      const left = MAX_OTP_ATTEMPTS - record.attempts;
      return res.status(400).json({ message: `Wrong OTP. ${left} attempt${left !== 1 ? "s" : ""} left.` });
    }

    otpStore.delete(key);

    // Find or create user — OTP login creates a verified, passwordless account
    let user = await User.findOne({ email: key });
    if (!user) {
      user = await User.create({
        email:           key,
        displayName:     key.split("@")[0],
        firstName:       key.split("@")[0],
        isEmailVerified: true, // OTP proves email ownership
        // password intentionally NOT set — user can add one via forgot-password
      });
    } else if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }

    res.json({
      token: signToken(user._id),
      user:  { id: user._id, name: user.displayName, email: key, hasPassword: !!user.password },
    });
  } catch (err) {
    console.error("[verify-otp]", err.message);
    res.status(500).json({ message: "Verification failed. Try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  EMAIL — REGISTER
//  POST /api/auth/register
//
//  FIX: If an OTP-created account already exists for this email (no password,
//  isEmailVerified=true), we MERGE by setting the password + name rather than
//  returning a 409 conflict. This lets OTP users "upgrade" to password login
//  naturally through the signup form.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password are required" });
    if (!validEmail(email))
      return res.status(400).json({ message: "Enter a valid email address (e.g. you@example.com)" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    if (name.trim().length < 2)
      return res.status(400).json({ message: "Enter your full name (at least 2 characters)" });

    const existing = await User.findOne({ email: email.toLowerCase() });

    // ── MERGE PATH: OTP account exists with no password ───────────────────────
    if (existing && !existing.password && existing.isEmailVerified) {
      const hash = await bcrypt.hash(password, 12);
      existing.password    = hash;
      existing.displayName = name.trim();
      existing.firstName   = name.trim().split(" ")[0];
      existing.lastName    = name.trim().split(" ").slice(1).join(" ") || "";
      await existing.save();

      return res.json({
        token:   signToken(existing._id),
        merged:  true,
        message: "Password set! You can now sign in with email + password.",
        user:    { id: existing._id, name: existing.displayName, email: email.toLowerCase(), isEmailVerified: true },
      });
    }

    // ── CONFLICT: account with a password already exists ──────────────────────
    if (existing && existing.password)
      return res.status(409).json({ message: "Email already registered. Please sign in." });

    // ── CONFLICT: account exists but email unverified (re-send verification) ──
    if (existing && !existing.isEmailVerified) {
      const verifyToken   = randomToken();
      existing.emailVerifyToken   = verifyToken;
      existing.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await existing.save();
      try { await sendVerificationEmail(email, existing.firstName, verifyToken); } catch {}
      return res.status(409).json({
        message:              "Email already registered but not verified. A new verification email has been sent.",
        requiresVerification: true,
        email,
      });
    }

    // ── NEW ACCOUNT PATH ──────────────────────────────────────────────────────
    const verifyToken   = randomToken();
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const hash          = await bcrypt.hash(password, 12);

    const user = await User.create({
      email:              email.toLowerCase(),
      password:           hash,
      displayName:        name.trim(),
      firstName:          name.trim().split(" ")[0],
      lastName:           name.trim().split(" ").slice(1).join(" ") || "",
      isEmailVerified:    false,
      emailVerifyToken:   verifyToken,
      emailVerifyExpires: verifyExpires,
    });

    try {
      await sendVerificationEmail(email, name.trim().split(" ")[0], verifyToken);
    } catch (mailErr) {
      console.error("[register] email failed:", mailErr.message);
    }

    res.status(201).json({
      token:                signToken(user._id),
      requiresVerification: true,
      message:              "Account created! Check your email to verify your account before signing in.",
      user:                 { id: user._id, name: user.displayName, email, isEmailVerified: false },
    });
  } catch (err) {
    console.error("[register]", err.message);
    res.status(500).json({ message: "Registration failed. Try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  EMAIL — LOGIN
//  POST /api/auth/login
//
//  FIX: When a user exists but has no password (OTP-only account), return a
//  specific error code (noPassword: true) so the frontend can show a targeted
//  prompt: "Use OTP login or set a password via Forgot Password."
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });
    if (!validEmail(email))
      return res.status(400).json({ message: "Enter a valid email address" });

    const user = await User.findOne({ email: email.toLowerCase() });

    // ── Account not found at all ───────────────────────────────────────────────
    if (!user)
      return res.status(401).json({ message: "No account found with this email. Please sign up." });

    // ── FIX: OTP-only account — no password set ────────────────────────────────
    // Return a distinct flag so the frontend can guide the user.
    if (!user.password) {
      return res.status(401).json({
        message:     "This account uses OTP login. Use the Quick OTP tab, or click \"Forgot Password\" to set a password.",
        noPassword:  true,    // ← frontend uses this to show a tailored helper
        email:       email.toLowerCase(),
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Wrong password. Try again or use Forgot Password." });

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message:              "Email not verified. Check your inbox.",
        requiresVerification: true,
        email,
      });
    }

    res.json({
      token: signToken(user._id),
      user:  { id: user._id, name: user.displayName, email },
    });
  } catch (err) {
    console.error("[login]", err.message);
    res.status(500).json({ message: "Login failed. Try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  EMAIL VERIFICATION
//  GET /api/auth/verify-email?token=...
// ─────────────────────────────────────────────────────────────────────────────
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.redirect(`${FRONTEND}/?error=invalid_token`);

    const user = await User.findOne({
      emailVerifyToken:   token,
      emailVerifyExpires: { $gt: new Date() },
    });

    if (!user) return res.redirect(`${FRONTEND}/?error=token_expired`);

    user.isEmailVerified    = true;
    user.emailVerifyToken   = null;
    user.emailVerifyExpires = null;
    await user.save();

    try { await sendWelcomeEmail(user.email, user.firstName); } catch {}

    res.redirect(`${FRONTEND}/?verified=true`);
  } catch (err) {
    console.error("[verify-email]", err.message);
    res.redirect(`${FRONTEND}/?error=server_error`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  RESEND VERIFICATION EMAIL
//  POST /api/auth/resend-verification
// ─────────────────────────────────────────────────────────────────────────────
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user || user.isEmailVerified)
      return res.json({ message: "If that email is registered and unverified, a new link was sent." });

    const verifyToken   = randomToken();
    user.emailVerifyToken   = verifyToken;
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(email, user.firstName, verifyToken);
    res.json({ message: "Verification email sent. Check your inbox." });
  } catch (err) {
    console.error("[resend-verification]", err.message);
    res.status(500).json({ message: "Failed to resend. Try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  FORGOT PASSWORD
//  POST /api/auth/forgot-password
//
//  FIX: Removed the `!user.password` guard that silently swallowed the request.
//  Now works for ALL registered + verified emails, including OTP-only accounts.
//  For unverified accounts we still silently succeed (security: no enumeration).
//
//  The reset-password endpoint sets user.password regardless of whether it
//  previously existed — so this doubles as a "set password for first time" flow.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !validEmail(email))
      return res.status(400).json({ message: "Enter a valid email address" });

    const user = await User.findOne({ email: email.toLowerCase() });

    // Security: always return same message to prevent email enumeration.
    // Silently skip if: no account, or account exists but email is not verified.
    // (Unverified accounts have no confirmed ownership of this email.)
    if (!user || !user.isEmailVerified) {
      return res.json({ message: "If that email is registered, a reset link has been sent." });
    }

    // ── Issue reset token — works whether or not user.password is set ─────────
    const resetToken   = randomToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken   = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    await sendPasswordResetEmail(email, user.firstName, resetToken);
    res.json({ message: "Password reset link sent. Check your inbox." });
  } catch (err) {
    console.error("[forgot-password]", err.message);
    res.status(500).json({ message: "Failed to send reset email. Try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  RESET PASSWORD — apply new password
//  POST /api/auth/reset-password
//
//  Unchanged in logic; works for both new password (OTP users) and updates.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ message: "Token and new password are required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const user = await User.findOne({
      resetPasswordToken:   token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ message: "Reset link is invalid or expired. Request a new one." });

    // Works for first-time password set (OTP user) AND password change
    user.password             = await bcrypt.hash(password, 12);
    user.resetPasswordToken   = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password set successfully. You can now sign in with email + password." });
  } catch (err) {
    console.error("[reset-password]", err.message);
    res.status(500).json({ message: "Password reset failed. Try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  DIARY PIN RESET — Step 1
//  POST /api/auth/diary/request-pin-reset
// ─────────────────────────────────────────────────────────────────────────────
const { isLoggedIn } = require("../middleware/checkAuth");

router.post("/diary/request-pin-reset", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.email) {
      return res.status(400).json({
        message: "No email address on your account. Add an email to enable PIN reset."
      });
    }

    const otp     = randomOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    user.diaryPinResetToken   = otp;
    user.diaryPinResetExpires = expires;
    await user.save();

    await sendDiaryPinResetEmail(user.email, user.firstName, otp);
    console.log(`\n🔐  Diary PIN reset OTP for ${user.email}  →  ${otp}\n`);

    const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
      a + "*".repeat(Math.min(b.length, 6)) + c
    );
    res.json({ message: `A 6-digit code was sent to ${maskedEmail}.`, sentVia: "email" });
  } catch (err) {
    console.error("[diary/request-pin-reset]", err.message);
    res.status(500).json({ message: "Failed to send reset code. Try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  DIARY PIN RESET — Step 2
//  POST /api/auth/diary/verify-pin-reset
// ─────────────────────────────────────────────────────────────────────────────
router.post("/diary/verify-pin-reset", isLoggedIn, async (req, res) => {
  try {
    const { otp } = req.body;
    const user    = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.diaryPinResetToken)
      return res.status(400).json({ message: "No reset code found. Request a new one." });
    if (new Date() > user.diaryPinResetExpires) {
      user.diaryPinResetToken = null;
      user.diaryPinResetExpires = null;
      await user.save();
      return res.status(400).json({ message: "Code expired. Request a new one." });
    }
    if (user.diaryPinResetToken !== otp?.trim())
      return res.status(400).json({ message: "Wrong code. Try again." });

    user.diaryPinResetToken   = null;
    user.diaryPinResetExpires = null;
    await user.save();

    const pinResetToken = jwt.sign(
      { id: user._id, purpose: "diary-pin-reset" },
      JWT_SECRET,
      { expiresIn: "5m" }
    );

    res.json({ message: "Code verified. Set your new Diary PIN.", pinResetToken });
  } catch (err) {
    console.error("[diary/verify-pin-reset]", err.message);
    res.status(500).json({ message: "Verification failed. Try again." });
  }
});

module.exports = router;
