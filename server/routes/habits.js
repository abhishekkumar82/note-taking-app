const express = require("express");
const router  = express.Router();
const { isLoggedIn } = require("../middleware/checkAuth");
const Habit    = require("../models/Habit");
const HabitLog = require("../models/HabitLog");
  const { checkPremium } = require("../middleware/checkPremium");

// All routes require auth
// router.use(isLoggedIn);
  router.use(isLoggedIn, checkPremium);
// ── Habits CRUD ──────────────────────────────────────────────────────────────
console.log("isLoggedIn:", isLoggedIn);
console.log("checkPremium:", checkPremium);
// GET all habits for user
router.get("/", async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(habits);
  } catch (e) { res.status(500).json({ message: "Fetch failed" }); }
});

// POST create habit
router.post("/", async (req, res) => {
  try {
    const habit = await Habit.create({ ...req.body, user: req.user._id });
    res.status(201).json(habit);
  } catch (e) { res.status(500).json({ message: "Create failed" }); }
});

// DELETE habit (also deletes its logs)
router.delete("/:id", async (req, res) => {
  try {
    await Habit.deleteOne({ _id: req.params.id, user: req.user._id });
    await HabitLog.deleteMany({ habitId: req.params.id, user: req.user._id });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Delete failed" }); }
});

// ── Habit Logs ───────────────────────────────────────────────────────────────

// GET all logs for user
router.get("/logs", async (req, res) => {
  try {
    const logs = await HabitLog.find({ user: req.user._id });
    res.json(logs);
  } catch (e) { res.status(500).json({ message: "Fetch logs failed" }); }
});

// POST upsert log for a habit on a date
router.post("/logs", async (req, res) => {
  try {
    const { habitId, date, status } = req.body;
    const log = await HabitLog.findOneAndUpdate(
      { habitId, date, user: req.user._id },
      { status, user: req.user._id },
      { upsert: true, new: true }
    );
    res.json(log);
  } catch (e) { res.status(500).json({ message: "Log update failed" }); }
});

// DELETE log (clear status for a day)
router.delete("/logs/:habitId/:date", async (req, res) => {
  try {
    await HabitLog.deleteOne({ habitId: req.params.habitId, date: req.params.date, user: req.user._id });
    res.json({ message: "Log cleared" });
  } catch (e) { res.status(500).json({ message: "Log delete failed" }); }
});

module.exports = router;
