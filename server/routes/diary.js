// server/routes/diary.js
// ─────────────────────────────────────────────────────────────────────────────
// Dedicated diary routes — entries stored with isDiary:true flag
// so they NEVER appear in the main Notes section.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const { isLoggedIn } = require("../middleware/checkAuth");
const Note    = require("../models/Notes");
  const { checkPremium } = require("../middleware/checkPremium");
  router.use(isLoggedIn, checkPremium);
// All routes require authentication


// GET /api/diary — fetch ALL diary entries for this user (isDiary only)
router.get("/", async (req, res) => {
  try {
    const entries = await Note.find({
      user: req.user._id,
      isDiary: true,
      isDeleted: false,
    }).sort({ isPinned: -1, createdAt: -1 });

    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch diary entries" });
  }
});

// POST /api/diary — create a new diary entry
router.post("/", async (req, res) => {
  try {
    const entry = await Note.create({
      user:      req.user._id,
      title:     req.body.title     || `Entry — ${new Date().toLocaleDateString()}`,
      body:      req.body.body      || "",
      color:     req.body.color     || "#fffaf0",
      mood:      req.body.mood      || null,
      isPinned:  req.body.isPinned  || false,
      tags:      ["diary-entry"],    // always tag as diary, never shown in Notes
      folder:    "Personal Diary",
      isDiary:   true,               // KEY FLAG — filters out from main Notes
      isDeleted: false,
    });

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: "Failed to create diary entry" });
  }
});

// PUT /api/diary/:id — update an entry
router.put("/:id", async (req, res) => {
  try {
    const entry = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, isDiary: true },
      {
        title:    req.body.title,
        body:     req.body.body,
        color:    req.body.color,
        mood:     req.body.mood,
        isPinned: req.body.isPinned,
        updatedAt: Date.now(),
      },
      { new: true }
    );
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// DELETE /api/diary/:id — soft-delete
router.delete("/:id", async (req, res) => {
  try {
    await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, isDiary: true },
      { isDeleted: true, deletedAt: new Date() }
    );
    res.json({ message: "Entry deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;
