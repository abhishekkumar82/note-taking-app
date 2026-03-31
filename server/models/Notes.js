// server/models/Notes.js

const mongoose = require("mongoose");
const Schema   = mongoose.Schema;

const NoteSchema = new Schema({
  user: { type: Schema.ObjectId, ref: "User" },

  title: { type: String, required: true },
  body:  { type: String, required: true },

  // ── Appearance ──────────────────────────────────────────────────────────────
  isPinned: { type: Boolean, default: false },
  color:    { type: String,  default: "#ffffff" },

  // ── Organisation ────────────────────────────────────────────────────────────
  tags:   [String],
  folder: { type: String, default: "General" },

  // ── Reminder ────────────────────────────────────────────────────────────────
  reminder: { type: Date,    default: null },
  reminded: { type: Boolean, default: false },
  repeat:   { type: String,  enum: ["none", "daily", "weekly"], default: "none" },

  // FIX: Tracks how many times a reminder notification has fired (max 5).
  // Prevents spam — once this hits 5 we stop notifying.
  reminderNotifyCount: { type: Number, default: 0 },

  // FIX: Set to true once the 10-min-warning email has been sent so it
  // never fires twice for the same reminder time.
  reminderEmailSent: { type: Boolean, default: false },

  // ── State flags ─────────────────────────────────────────────────────────────
  isDeleted:  { type: Boolean, default: false },
  deletedAt:  { type: Date,    default: null },
  isLocked:   { type: Boolean, default: false },
  pin:        { type: String,  default: "" },

  // FEATURE 1: Archive
  isArchived: { type: Boolean, default: false },

  // ── Diary-specific ───────────────────────────────────────────────────────────
  isDiary: { type: Boolean, default: false },
  mood:    { type: String,  default: null },

  // ── Timestamps ──────────────────────────────────────────────────────────────
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Note", NoteSchema);
