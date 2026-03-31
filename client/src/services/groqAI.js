// src/services/groqAI.js
// ─────────────────────────────────────────────────────────────────────────────
// Groq AI service — uses the FREE Groq API (https://console.groq.com)
// Model used: llama-3.3-70b-versatile  (fast + free tier, great for text tasks)
//
// HOW TO GET YOUR KEY:
//  1. Go to https://console.groq.com
//  2. Sign up free → API Keys → Create Key
//  3. Add to your .env file:  VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxx
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL        = "llama-3.3-70b-versatile";  // Best free Groq model (2025)

const groqFetch = async (messages, maxTokens = 1024) => {
  const key = import.meta.env.VITE_GROQ_API_KEY;

  if (!key) {
    throw new Error("VITE_GROQ_API_KEY not set in .env");
  }

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API error ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
};

// ── AI Tools ──────────────────────────────────────────────────────────────────

/** Summarize a note body into 2–3 sentences */
export const summarizeNote = async (text) => {
  return groqFetch([
    { role: "system", content: "You are a concise writing assistant. Summarize the given text in 2-3 sentences. Return only the summary, no extra text." },
    { role: "user",   content: text },
  ], 300);
};

/** Improve / rewrite a note to be clearer and more professional */
export const improveNote = async (text) => {
  return groqFetch([
    { role: "system", content: "You are a writing editor. Rewrite the following text to be clearer, more concise, and professional. Keep the same meaning. Return only the improved text." },
    { role: "user",   content: text },
  ], 800);
};

/** Generate a list of action items / todos from a note */
export const extractTodos = async (text) => {
  return groqFetch([
    { role: "system", content: "Extract all action items or tasks from the text as a bullet list. Each item starts with '• '. Return ONLY the bullet list, nothing else." },
    { role: "user",   content: text },
  ], 400);
};

/** Translate a note to a given language */
export const translateNote = async (text, language = "Hindi") => {
  return groqFetch([
    { role: "system", content: `Translate the following text to ${language}. Return only the translated text.` },
    { role: "user",   content: text },
  ], 800);
};

/** Generate a title suggestion from note body */
export const suggestTitle = async (text) => {
  return groqFetch([
    { role: "system", content: "Suggest a short, catchy title (max 8 words) for the following note. Return ONLY the title, no quotes." },
    { role: "user",   content: text },
  ], 50);
};

/** Expand a short note into a full paragraph */
export const expandNote = async (text) => {
  return groqFetch([
    { role: "system", content: "Expand the following brief note into a well-written paragraph with more detail. Return only the expanded text." },
    { role: "user",   content: text },
  ], 600);
};

/** Analyze mood of a diary entry */
export const analyzeMood = async (text) => {
  return groqFetch([
    { role: "system", content: "Analyze the mood/emotion of this diary entry. Give a one-line mood summary and 2-3 supportive, empathetic sentences. Format: 'Mood: <mood>\n\n<supportive text>'" },
    { role: "user",   content: text },
  ], 200);
};

/** Chat with AI about note content */
export const chatAboutNote = async (noteText, userQuestion) => {
  return groqFetch([
    { role: "system", content: `You are a helpful assistant. The user has a note with this content:\n\n${noteText}\n\nAnswer questions about it helpfully and concisely.` },
    { role: "user",   content: userQuestion },
  ], 500);
};
