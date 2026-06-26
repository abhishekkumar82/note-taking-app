// server/routes/collab.js
const express = require("express");
const router  = express.Router();
const crypto  = require("crypto");
const { isLoggedIn } = require("../middleware/checkAuth");
const Note           = require("../models/Notes");
const SharedSession  = require("../models/SharedSession");

const genToken = () => crypto.randomBytes(16).toString("hex");

// ── POST /api/collab/start/:noteId ───────────────────────────────────────────
// Always creates a FRESH session (deactivates any old one first).
// FIX: Old code reused expired sessions → "link expired" on open.
// FIX: Old code returned same link every time → same token each click.
router.post("/start/:noteId", isLoggedIn, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.noteId, user: req.user._id });
    if (!note) return res.status(404).json({ message: "Note not found" });

    // Deactivate any existing session for this note so a fresh link is issued
    await SharedSession.findOneAndUpdate(
      { note: note._id, isActive: true },
      { isActive: false }
    );

    // Always create a new session with a new token
    const session = await SharedSession.create({
      note:       note._id,
      owner:      req.user._id,
      roomToken:  genToken(),
      permission: req.body.permission || "edit",
      expiresAt:  req.body.expiresInHours
        ? new Date(Date.now() + req.body.expiresInHours * 3600000)
        : null,
    });

    res.json({
      roomToken:  session.roomToken,
      shareUrl:   `${process.env.FRONTEND_URL || "http://localhost:5173"}/collab/${session.roomToken}`,
      permission: session.permission,
      expiresAt:  session.expiresAt,
    });
  } catch (err) {
    console.error("[collab/start]", err.message);
    res.status(500).json({ message: "Failed to start collaboration session" });
  }
});

// ── GET /api/collab/:roomToken ───────────────────────────────────────────────
// FIX: Now returns note.body so CollabNotePage can seed the editor with
// the saved content on first load (before any Socket.io sync arrives).
router.get("/:roomToken", async (req, res) => {
  try {
    const session = await SharedSession.findOne({
      roomToken: req.params.roomToken,
      isActive:  true,
    }).populate("note", "title body color");

    if (!session) return res.status(404).json({ message: "Invalid or expired link" });

    if (session.expiresAt && new Date() > session.expiresAt) {
      return res.status(410).json({ message: "This share link has expired" });
    }

    res.json({
      noteId:     session.note._id,
      title:      session.note.title,
      body:       session.note.body,   // ← ADDED: seed editor content
      color:      session.note.color,
      permission: session.permission,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to resolve room" });
  }
});

// ── DELETE /api/collab/:roomToken ────────────────────────────────────────────
router.delete("/:roomToken", isLoggedIn, async (req, res) => {
  try {
    const session = await SharedSession.findOneAndUpdate(
      { roomToken: req.params.roomToken, owner: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json({ message: "Collaboration link revoked" });
  } catch {
    res.status(500).json({ message: "Failed to revoke" });
  }
});

module.exports = router;
