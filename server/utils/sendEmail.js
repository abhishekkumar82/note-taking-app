// server/utils/sendEmail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const APP   = "Write Up";
const FRONT = process.env.FRONTEND_URL || "http://localhost:5173";
const FROM  = `"${APP}" <${process.env.EMAIL_USER}>`;

const html = (body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;color:#1e293b}
    .wrap{max-width:540px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0}
    .hdr{background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:28px 36px}
    .hdr-logo{color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px}
    .hdr-logo span{opacity:.7;font-weight:400}
    .body{padding:32px 36px}
    p{font-size:15px;line-height:1.7;color:#374151;margin-bottom:16px}
    .btn{display:inline-block;margin:8px 0 24px;padding:13px 30px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700}
    .otp{display:inline-block;margin:8px 0 24px;padding:16px 36px;background:#eef2ff;border-radius:12px;font-size:34px;font-weight:800;letter-spacing:12px;color:#4338ca;border:2px solid #c7d2fe}
    .alert-box{background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:16px 20px;margin-bottom:20px}
    .alert-box h3{color:#c2410c;font-size:16px;margin-bottom:6px}
    .alert-box p{color:#7c2d12;font-size:14px;margin:0}
    .note{font-size:13px;color:#94a3b8;line-height:1.6}
    .divider{height:1px;background:#f1f5f9;margin:8px 0 20px}
    .ftr{padding:20px 36px;background:#f8fafc;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;line-height:1.6}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <div class="hdr-logo">✏️ ${APP} <span>— Your productivity workspace</span></div>
    </div>
    <div class="body">${body}</div>
    <div class="ftr">
      You received this because you have a reminder set in ${APP}.<br/>
      © ${new Date().getFullYear()} ${APP}
    </div>
  </div>
</body>
</html>
`;

// ── 1. Login OTP ──────────────────────────────────────────────────────────────
exports.sendLoginOtpEmail = async (to, otp) => {
  await transporter.sendMail({
    from: FROM, to,
    subject: `${otp} is your ${APP} login code`,
    html: html(`
      <p>Your one-time login code for <strong>${APP}</strong> is:</p>
      <div class="otp">${otp}</div>
      <p class="note">Valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
    `),
  });
};

// ── 2. Email Verification ─────────────────────────────────────────────────────
exports.sendVerificationEmail = async (to, name, token) => {
  const link = `${FRONT}/api/auth/verify-email?token=${token}`;
  await transporter.sendMail({
    from: FROM, to,
    subject: `Verify your ${APP} email`,
    html: html(`
      <p>Hi <strong>${name}</strong> 👋</p>
      <p>Welcome to <strong>${APP}</strong>! Please verify your email address to activate your account.</p>
      <a class="btn" href="${link}">Verify Email →</a>
      <div class="divider"></div>
      <p class="note">This link expires in <strong>24 hours</strong>.<br/>
      If the button doesn't work, copy: <a href="${link}" style="color:#6366f1;word-break:break-all">${link}</a></p>
    `),
  });
};

// ── 3. Password Reset ─────────────────────────────────────────────────────────
exports.sendPasswordResetEmail = async (to, name, token) => {
  const link = `${FRONT}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM, to,
    subject: `Reset your ${APP} password`,
    html: html(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>We received a request to reset your password. Click below to choose a new one.</p>
      <a class="btn" href="${link}">Reset Password →</a>
      <div class="divider"></div>
      <p class="note">This link expires in <strong>1 hour</strong>.<br/>
      If you didn't request this, ignore this email — your password won't change.</p>
    `),
  });
};

// ── 4. Diary PIN Reset OTP ────────────────────────────────────────────────────
exports.sendDiaryPinResetEmail = async (to, name, otp) => {
  await transporter.sendMail({
    from: FROM, to,
    subject: `${APP} — Your Diary PIN reset code`,
    html: html(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>Here is your 6-digit code to reset your <strong>Diary PIN</strong>:</p>
      <div class="otp">${otp}</div>
      <p class="note">Valid for <strong>10 minutes</strong>. Your diary entries are safe — this only resets your PIN.</p>
    `),
  });
};

// ── 5. Welcome ────────────────────────────────────────────────────────────────
exports.sendWelcomeEmail = async (to, name) => {
  await transporter.sendMail({
    from: FROM, to,
    subject: `Welcome to ${APP}! 🎉`,
    html: html(`
      <p>Hi <strong>${name}</strong> 🎉</p>
      <p>Your email is verified and your ${APP} account is ready. Start taking notes, tracking habits, and building your personal diary.</p>
      <a class="btn" href="${FRONT}/dashboard">Open ${APP} →</a>
    `),
  });
};

// ── 6. FEATURE 2: 10-minute reminder warning ──────────────────────────────────
// Sent once when a note's reminder is ≤10 minutes away.
// The cron job in cronJobs.js calls this and sets reminderEmailSent=true
// so it never fires twice for the same reminder.
exports.sendReminderWarningEmail = async (to, name, noteTitle, reminderTime) => {
  const timeStr = new Date(reminderTime).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });
  await transporter.sendMail({
    from: FROM, to,
    subject: `⏰ Reminder in 10 minutes — ${noteTitle}`,
    html: html(`
      <p>Hi <strong>${name}</strong>,</p>
      <div class="alert-box">
        <h3>⏰ Reminder in ~10 minutes</h3>
        <p><strong>${noteTitle}</strong> is due at ${timeStr}</p>
      </div>
      <p>Head over to your dashboard to review this note before the reminder fires.</p>
      <a class="btn" href="${FRONT}/dashboard">Open ${APP} →</a>
      <p class="note">You're receiving this because you set a reminder in ${APP}.</p>
    `),
  });
};
