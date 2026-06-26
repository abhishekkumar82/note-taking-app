// server/routes/semanticSearch.js
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/search/semantic
// Body: { query: string, limit?: number }
//
// Embeds the search query, then ranks all of the user's notes by cosine
// similarity between the query vector and each note's stored embedding.
// This finds conceptually related notes even with zero keyword overlap —
// e.g. "things about my car" matches a note titled "Vehicle insurance".
//
// This intentionally runs in plain JS (not a DB-level vector index) so it
// works on ANY MongoDB — local, free-tier Atlas, anything. For larger note
// counts (thousands+) you'd eventually want MongoDB Atlas Vector Search or
// a dedicated vector DB, but for a personal notes app, scanning a few
// hundred 384-length arrays in memory is well under 50ms.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const { isLoggedIn } = require("../middleware/checkAuth");
const Note = require("../models/Notes");
const { embedText, cosineSimilarity, stripHtml } = require("../services/embeddingService");

const MIN_SIMILARITY = 0.25; // below this, results are considered irrelevant noise

router.post("/semantic", isLoggedIn, async (req, res) => {
  try {
    const { query, limit = 15 } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // 1. Embed the search query itself
    const queryVector = await embedText(query);

    // 2. Pull candidate notes — only those with an embedding already computed.
    //    (Notes created before this feature existed, or still mid-queue,
    //    are skipped gracefully — see /api/search/reindex below to backfill.)
    const notes = await Note.find({
      user: req.user._id,
      isDeleted: false,
      isDiary: { $ne: true },
      isArchived: { $ne: true },
      embedding: { $exists: true, $ne: [] },
    }).select("title body color tags folder isPinned reminder createdAt updatedAt embedding");

    // 3. Score every candidate by cosine similarity, keep the relevant ones
    const scored = notes
      .map(note => ({
        note,
        score: cosineSimilarity(queryVector, note.embedding),
      }))
      .filter(r => r.score >= MIN_SIMILARITY)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // 4. Shape the response — strip the embedding array out (no need to ship
    //    384 floats per note back to the client) and include a short snippet
    //    plus the match score for UI display ("82% match").
    const results = scored.map(({ note, score }) => {
      const plain = stripHtml(note.body);
      return {
        _id:        note._id,
        title:      note.title,
        snippet:    plain.slice(0, 160),
        color:      note.color,
        tags:       note.tags,
        folder:     note.folder,
        isPinned:   note.isPinned,
        reminder:   note.reminder,
        createdAt:  note.createdAt,
        updatedAt:  note.updatedAt,
        matchScore: Math.round(score * 100), // as a percentage for the UI
      };
    });

    res.json({ results, query });
  } catch (err) {
    console.error("[semantic-search]", err.message);
    res.status(500).json({ message: "Semantic search failed" });
  }
});

// ── POST /api/search/reindex ─────────────────────────────────────────────────
// Backfills embeddings for any of the user's notes that don't have one yet
// (e.g. notes created before this feature was added). Safe to call anytime;
// already-embedded notes are skipped.
router.post("/reindex", isLoggedIn, async (req, res) => {
  try {
    const { enqueueEmbedding } = require("../utils/embeddingQueue");

    const notes = await Note.find({
      user: req.user._id,
      isDeleted: false,
      $or: [
        { embedding: { $exists: false } },
        { embedding: { $size: 0 } },
      ],
    }).select("_id");

    notes.forEach(n => enqueueEmbedding(n._id));

    res.json({
      message: `Queued ${notes.length} note(s) for indexing.`,
      queued: notes.length,
    });
  } catch (err) {
    console.error("[semantic-search/reindex]", err.message);
    res.status(500).json({ message: "Reindex failed" });
  }
});

module.exports = router;