// server/models/User.js  (updated with premium subscription fields)
const mongoose = require("mongoose");
const Schema   = mongoose.Schema;

const UserSchema = new Schema({
  // ── Auth methods ───────────────────────────────────────────────────────────
  googleId:      { type: String, default: null },
  email:         { type: String, default: null, lowercase: true, trim: true },
  password:      { type: String, default: null },
  phone:         { type: String, default: null, trim: true },
  phoneVerified: { type: Boolean, default: false },

  // ── Email verification ─────────────────────────────────────────────────────
  isEmailVerified:      { type: Boolean, default: false },
  emailVerifyToken:     { type: String,  default: null },
  emailVerifyExpires:   { type: Date,    default: null },

  // ── Password reset ─────────────────────────────────────────────────────────
  resetPasswordToken:   { type: String,  default: null },
  resetPasswordExpires: { type: Date,    default: null },

  // ── Diary PIN reset ────────────────────────────────────────────────────────
  diaryPinResetToken:   { type: String,  default: null },
  diaryPinResetExpires: { type: Date,    default: null },

  // ── Profile ────────────────────────────────────────────────────────────────
  displayName:  { type: String, required: true },
  firstName:    { type: String, required: true },
  lastName:     { type: String, default: "" },
  profileImage: { type: String, default: "" },

  // ── 💎 Premium Subscription ───────────────────────────────────────────────
  isPremium:        { type: Boolean, default: false },
  premiumPlan:      { type: String,  enum: ["monthly", "yearly"], default: null },
  premiumSince:     { type: Date,    default: null },
  premiumExpiresAt: { type: Date,    default: null },
  lastPaymentId:    { type: String,  default: null },  // razorpay payment_id
  lastOrderId:      { type: String,  default: null },  // razorpay order_id
// server/models/User.js — "💎 Premium Subscription" section mein add karo

  // ── Timestamps ─────────────────────────────────────────────────────────────
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
