// server/utils/embeddingQueue.js
// ─────────────────────────────────────────────────────────────────────────────
// A tiny in-process job queue so note creation/update requests return
// instantly to the user, while embedding generation (which takes ~50-200ms
// per note on CPU) happens in the background afterward.
//
// This is intentionally simple (no Redis/BullMQ) — appropriate for a
// single-server deployment. If you later add the BullMQ feature (#9 from
// your list), this queue can be swapped for a real Redis-backed one with
// the same enqueue() interface.
// ─────────────────────────────────────────────────────────────────────────────

const { embedNote } = require("../services/embeddingService");
const Note = require("../models/Notes");

const queue = [];
let processing = false;

async function processQueue() {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const noteId = queue.shift();
    try {
      const note = await Note.findById(noteId);
      if (!note || note.isDeleted) continue;

      const vector = await embedNote(note);
      await Note.findByIdAndUpdate(noteId, {
        embedding: vector,
        embeddingUpdatedAt: new Date(),
      });
      console.log(`[embeddingQueue] Embedded note ${noteId}`);
    } catch (err) {
      console.error(`[embeddingQueue] Failed to embed note ${noteId}:`, err.message);
    }
  }

  processing = false;
}

/**
 * Queue a note for (re)embedding. Safe to call on every create/update —
 * duplicate IDs already queued are skipped.
 */
function enqueueEmbedding(noteId) {
  const id = String(noteId);
  if (!queue.includes(id)) queue.push(id);
  // Fire and forget — don't await this in route handlers
  processQueue().catch(err => console.error("[embeddingQueue] processQueue error:", err.message));
}

module.exports = { enqueueEmbedding };