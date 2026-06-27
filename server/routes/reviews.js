const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const User = require("../models/User");
const { isLoggedIn } = require("../middleware/checkAuth");

// ── GET /api/reviews — public feed (landing page) ─────────────────────────────
// Pro reviews first, then remaining by newest
router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "displayName firstName profileImage isPremium")
      .sort({ createdAt: -1 })
      .lean();

    const pro = reviews.filter((r) => r.user?.isPremium);
    const rest = reviews.filter((r) => !r.user?.isPremium);

    res.json([...pro, ...rest]);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reviews." });
  }
});

// ── GET /api/reviews/mine — authenticated user's own review ───────────────────
router.get("/mine", isLoggedIn, async (req, res) => {
  try {
    const review = await Review.findOne({ user: req.user._id }).lean();
    res.json(review || null);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch your review." });
  }
});

// ── POST /api/reviews — submit (creates or updates) ──────────────────────────
router.post("/", isLoggedIn, async (req, res) => {
  const { rating, reviewText } = req.body;

  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ message: "Rating must be between 1 and 5." });
  if (!reviewText || !reviewText.trim())
    return res.status(400).json({ message: "Review text is required." });

  try {
    const review = await Review.findOneAndUpdate(
      { user: req.user._id },
      { rating, reviewText: reviewText.trim() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json(review);
  } catch (err) {
    res.status(500).json({ message: "Failed to save review." });
  }
});

// ── DELETE /api/reviews/mine — remove own review ──────────────────────────────
router.delete("/mine", isLoggedIn, async (req, res) => {
  try {
    await Review.findOneAndDelete({ user: req.user._id });
    res.json({ message: "Review deleted." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete review." });
  }
});

module.exports = router;
