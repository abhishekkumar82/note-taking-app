// src/utils/diaryEncryption.js
// ─────────────────────────────────────────────────────────────────────────────
// Client-side AES-GCM encryption for diary entries.
//
// Flow:
//   PIN  ──PBKDF2──►  CryptoKey  ──AES-GCM──►  ciphertext (stored in DB)
//
// The PIN (and therefore the derived key) NEVER leaves the browser.
// MongoDB only stores opaque base-64 ciphertext.
//
// Ciphertext format stored in the `body` field:
//   "enc:<base64(iv)>:<base64(ciphertext)>"
//
// Plain notes that were saved before this feature existed are detected by the
// absence of the "enc:" prefix and displayed as-is (backward compatible).
// ─────────────────────────────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 200_000;
const SALT_KEY          = "wu_diary_salt"; // localStorage key for per-user salt

// ── Salt management ───────────────────────────────────────────────────────────
// We need a stable salt so the same PIN always derives the same key.
// We store a random 16-byte salt in localStorage per userId.
// (The salt is NOT secret — it just prevents pre-computation attacks.)

export function getOrCreateSalt(userId) {
  const key = `${SALT_KEY}_${userId}`;
  const existing = localStorage.getItem(key);
  if (existing) {
    // Stored as hex string → Uint8Array
    return hexToBytes(existing);
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(key, bytesToHex(salt));
  return salt;
}

// ── Key derivation ────────────────────────────────────────────────────────────
// Derives an AES-GCM CryptoKey from the user's PIN + salt using PBKDF2.
// Memoised per (pin+userId) inside DiaryPage so we don't re-derive on every
// encrypt/decrypt call.

export async function deriveKey(pin, salt) {
  const enc     = new TextEncoder();
  const keyMat  = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name:       "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash:       "SHA-256",
    },
    keyMat,
    { name: "AES-GCM", length: 256 },
    false,               // not extractable
    ["encrypt", "decrypt"]
  );
}

// ── Encrypt ───────────────────────────────────────────────────────────────────
// Returns a string: "enc:<b64iv>:<b64ciphertext>"
export async function encryptText(plaintext, cryptoKey) {
  if (!plaintext) return plaintext;
  const iv         = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const enc        = new TextEncoder();
  const cipherBuf  = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    enc.encode(plaintext)
  );
  return `enc:${bufToB64(iv)}:${bufToB64(cipherBuf)}`;
}

// ── Decrypt ───────────────────────────────────────────────────────────────────
// Accepts "enc:<b64iv>:<b64ciphertext>" and returns the original plaintext.
// If the value does NOT start with "enc:" it's returned unchanged (old entries).
export async function decryptText(ciphertext, cryptoKey) {
  if (!ciphertext || !ciphertext.startsWith("enc:")) return ciphertext; // legacy plain entry
  const [, ivB64, dataB64] = ciphertext.split(":");
  const iv         = b64ToBuf(ivB64);
  const data       = b64ToBuf(dataB64);
  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      data
    );
    return new TextDecoder().decode(plainBuf);
  } catch {
    // Wrong key / tampered data — return a visible error string so the UI
    // can warn the user instead of silently showing garbage.
    return "__DECRYPTION_FAILED__";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export const isEncrypted = (s) => typeof s === "string" && s.startsWith("enc:");

function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64ToBuf(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr;
}