// server/controllers/dashboardController.js
const Note = require("../models/Notes");

// ─── GET: All Notes (excludes diary + archived) ───────────────────────────────
exports.dashboard = async (req, res) => {
  try {
    const notes = await Note.find({
      user:       req.user._id,
      isDeleted:  false,
      isDiary:    { $ne: true },
      isArchived: { $ne: true },  // active notes only
    }).sort({ isPinned: -1, updatedAt: -1 });

    res.status(200).json({ userName: req.user.firstName, notes });
  } catch {
    res.status(500).json({ message: "Error fetching notes" });
  }
};

// ─── POST: Add Note ────────────────────────────────────────────────────────────
exports.dashboardAddNoteSubmit = async (req, res) => {
  try {
    const newNote = await Note.create({
      title:      req.body.title,
      body:       req.body.body,
      color:      req.body.color,
      tags:       req.body.tags    || [],
      folder:     req.body.folder  || "General",
      reminder:   req.body.reminder || null,
      repeat:     req.body.repeat   || "none",
      isArchived: req.body.isArchived || false,
      isDiary:    false,
      user:       req.user._id,
    });
    res.status(201).json(newNote);
  } catch {
    res.status(500).json({ message: "Failed to create note" });
  }
};

// ─── PUT: Update Note ──────────────────────────────────────────────────────────
exports.dashboardUpdateNote = async (req, res) => {
  try {
    const updatedNote = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        title:      req.body.title,
        body:       req.body.body,
        color:      req.body.color,
        folder:     req.body.folder,
        reminder:   req.body.reminder,
        repeat:     req.body.repeat,
        isPinned:   req.body.isPinned,
        isArchived: req.body.isArchived,
        updatedAt:  Date.now(),
      },
      { new: true }
    );
    res.status(200).json(updatedNote);
  } catch {
    res.status(500).json({ message: "Update failed" });
  }
};

// ─── DELETE: Soft-delete ──────────────────────────────────────────────────────
exports.dashboardDeleteNote = async (req, res) => {
  try {
    await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isDeleted: true, deletedAt: new Date() }
    );
    res.status(200).json({ message: "Note deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
};

// ─── FEATURE 1: Archive a note ────────────────────────────────────────────────
// PUT /api/dashboard/archive/:id
exports.archiveNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isArchived: true, updatedAt: Date.now() },
      { new: true }
    );
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  } catch {
    res.status(500).json({ message: "Archive failed" });
  }
};

// ─── FEATURE 1: Unarchive a note ─────────────────────────────────────────────
// PUT /api/dashboard/unarchive/:id
exports.unarchiveNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isArchived: false, updatedAt: Date.now() },
      { new: true }
    );
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  } catch {
    res.status(500).json({ message: "Unarchive failed" });
  }
};

// ─── FEATURE 1: Get archived notes ───────────────────────────────────────────
// GET /api/dashboard/archived
exports.getArchivedNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      user:       req.user._id,
      isArchived: true,
      isDeleted:  false,
      isDiary:    { $ne: true },
    }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch {
    res.status(500).json({ message: "Archive fetch failed" });
  }
};

// ─── POST: Search (excludes diary + archived) ─────────────────────────────────
exports.dashboardSearchSubmit = async (req, res) => {
  try {
    const words    = (req.body.searchTerm || "").split(" ").filter(Boolean);
    const regexArr = words.map(w => new RegExp(w, "i"));

    const results = await Note.find({
      user:       req.user._id,
      isDeleted:  false,
      isDiary:    { $ne: true },
      isArchived: { $ne: true },
      $or: [
        { title: { $in: regexArr } },
        { body:  { $in: regexArr } },
        { tags:  { $in: regexArr } },
      ],
    });
    res.status(200).json({ searchResults: results });
  } catch {
    res.status(500).json({ message: "Search failed" });
  }
};

// ─── GET: Trash ────────────────────────────────────────────────────────────────
exports.getTrashNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      user:      req.user._id,
      isDeleted: true,
      isDiary:   { $ne: true },
    });
    res.status(200).json(notes);
  } catch {
    res.status(500).json({ message: "Trash fetch failed" });
  }
};

// ─── DELETE: Permanent ────────────────────────────────────────────────────────
exports.permanentDelete = async (req, res) => {
  try {
    await Note.deleteOne({ _id: req.params.id, user: req.user._id });
    res.json({ message: "Deleted permanently" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
};

// ─── PUT: Restore ─────────────────────────────────────────────────────────────
exports.restoreNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    res.status(200).json(note);
  } catch {
    res.status(500).json({ message: "Restore failed" });
  }
};

// ─── PUT: Lock / Unlock ───────────────────────────────────────────────────────
exports.toggleLock = async (req, res) => {
  const { pin, unlock } = req.body;
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ message: "Not found" });

  if (unlock) {
    if (note.pin !== pin) return res.status(400).json({ message: "Wrong PIN" });
    note.isLocked = false;
    await note.save();
    return res.json(note);
  }

  note.isLocked = true;
  note.pin      = pin;
  await note.save();
  res.json(note);
};
