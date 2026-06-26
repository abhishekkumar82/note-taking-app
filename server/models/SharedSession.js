// server/models/SharedSession.js
// ─────────────────────────────────────────────────────────────────────────────
// Tracks a "collaboration room" for a note — who can join, expiry, and
// permission level. The actual document content lives in Yjs's in-memory
// doc (persisted periodically back to Note.body).
// ─────────────────────────────────────────────────────────────────────────────
const mongoose = require("mongoose");
const Schema   = mongoose.Schema;

const SharedSessionSchema = new Schema({
  note:       { type: Schema.ObjectId, ref: "Note", required: true, index: true },
  owner:      { type: Schema.ObjectId, ref: "User", required: true },
  roomToken:  { type: String, required: true, unique: true }, // used in the share URL
  permission: { type: String, enum: ["edit", "view"], default: "edit" },
  expiresAt:  { type: Date, default: null }, // null = never expires
  isActive:   { type: Boolean, default: true },
  createdAt:  { type: Date, default: Date.now },

  // Lightweight presence log (optional, for "last active" display)
  collaborators: [{
    name:       String,
    color:      String,
    lastSeenAt: Date,
  }],
});

SharedSessionSchema.index({ roomToken: 1 });

module.exports = mongoose.model("SharedSession", SharedSessionSchema);