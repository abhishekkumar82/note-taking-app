// server/services/embeddingService.js
// ─────────────────────────────────────────────────────────────────────────────
// Generates vector embeddings for text using a local, free, open-source model
// (no API key, no per-request billing — runs entirely on your machine via
// @xenova/transformers, a JS port of HuggingFace Transformers).
//
// Model: Xenova/all-MiniLM-L6-v2 — 384-dimensional embeddings, ~90MB, fast
// enough for a notes app (typically 20-80ms per note on a normal laptop CPU).
//
// WANT TO USE OPENAI INSTEAD? Swap embedText() below for an OpenAI call:
//
//   const OpenAI = require("openai");
//   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//   async function embedText(text) {
//     const res = await openai.embeddings.create({
//       model: "text-embedding-3-small",   // 1536 dimensions
//       input: text.slice(0, 8000),
//     });
//     return res.data[0].embedding;
//   }
//
// (If you swap to OpenAI, also update EMBEDDING_DIMENSIONS below to 1536,
// and clear any previously stored 384-dim embeddings so dimensions don't mix.)
// ─────────────────────────────────────────────────────────────────────────────

let extractorPromise = null;

const EMBEDDING_DIMENSIONS = 384; // must match the model below

// Lazy-load the pipeline once, reuse across all requests (loading takes a
// few seconds on first call — subsequent calls are fast).
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      // Dynamic import because @xenova/transformers is an ESM-only package
      const { pipeline } = await import("@xenova/transformers");
      console.log("[embeddings] Loading local embedding model (first run downloads ~90MB)…");
      const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
      console.log("[embeddings] Model ready.");
      return extractor;
    })();
  }
  return extractorPromise;
}

// Strip HTML tags (Tiptap note bodies are HTML) down to plain text before
// embedding — embeddings work on meaning, not markup.
function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate a normalized embedding vector for a piece of text.
 * @param {string} text
 * @returns {Promise<number[]>} 384-length array of floats
 */
async function embedText(text) {
  const clean = stripHtml(text);
  if (!clean) return new Array(EMBEDDING_DIMENSIONS).fill(0);

  const extractor = await getExtractor();
  // mean pooling + L2 normalization gives a single fixed-length vector
  // that's directly comparable via cosine similarity / dot product
  const output = await extractor(clean, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

/**
 * Build the embedding input for a note: title weighted more heavily than
 * body by repeating it, since titles are usually more semantically dense.
 */
async function embedNote(note) {
  const title = note.title || "";
  const body  = stripHtml(note.body || "");
  // Repeating title twice gives it roughly proportional influence without
  // needing a separate weighted-average-of-two-vectors step.
  const combined = `${title}. ${title}. ${body}`.slice(0, 2000); // cap input length
  return embedText(combined);
}

/**
 * Cosine similarity between two equal-length vectors.
 * Since our vectors are already L2-normalized (normalize: true above),
 * this simplifies to a plain dot product — but we compute it generally
 * here in case vectors ever come from an unnormalized source (e.g. if you
 * later swap in OpenAI embeddings, which are NOT pre-normalized).
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
  embedText,
  embedNote,
  cosineSimilarity,
  stripHtml,
  EMBEDDING_DIMENSIONS,
};