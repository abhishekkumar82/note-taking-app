// src/utils/db.js
// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB layer — the local-first source of truth for notes.
//
// Two object stores:
//   1. "notes"       — mirrors what's in MongoDB. The UI reads from here
//                       ALWAYS (online or offline), so the app never blocks
//                       on network for rendering.
//   2. "pendingSync"  — a queue of write operations (create/update/delete)
//                       that happened while offline (or that we want to
//                       fire-and-forget even online). The sync engine
//                       (syncEngine.js) drains this queue whenever the
//                       browser comes back online.
//
// We use `idb`, a tiny promise-based wrapper around the native IndexedDB
// API (which is otherwise callback/event-based and painful to use directly).
// ─────────────────────────────────────────────────────────────────────────────

import { openDB } from "idb";

const DB_NAME = "writeup-offline-db";
const DB_VERSION = 1;

export const STORES = {
  NOTES: "notes",
  PENDING_SYNC: "pendingSync",
  META: "meta", // small key/value store for things like "lastSyncedAt"
};

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.NOTES)) {
          const noteStore = db.createObjectStore(STORES.NOTES, { keyPath: "_id" });
          noteStore.createIndex("updatedAt", "updatedAt");
          noteStore.createIndex("isDeleted", "isDeleted");
        }
        if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
          db.createObjectStore(STORES.PENDING_SYNC, { keyPath: "queueId", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

// ── Notes store operations ────────────────────────────────────────────────────

export async function getAllLocalNotes() {
  const db = await getDb();
  return db.getAll(STORES.NOTES);
}

export async function getLocalNote(id) {
  const db = await getDb();
  return db.get(STORES.NOTES, id);
}

/**
 * Upsert a note into local IndexedDB. Used both when:
 *  - the server confirms a write (real MongoDB _id, real updatedAt)
 *  - the user creates something offline (temporary local _id, see below)
 */
export async function putLocalNote(note) {
  const db = await getDb();
  return db.put(STORES.NOTES, note);
}

export async function putLocalNotes(notes) {
  const db = await getDb();
  const tx = db.transaction(STORES.NOTES, "readwrite");
  await Promise.all(notes.map(n => tx.store.put(n)));
  await tx.done;
}

export async function deleteLocalNote(id) {
  const db = await getDb();
  return db.delete(STORES.NOTES, id);
}

// ── Pending sync queue operations ─────────────────────────────────────────────

/**
 * Queue an operation to be sent to the server. `localOnly` operations
 * (offline-created notes) carry a temp client-generated ID that gets
 * reconciled with the real MongoDB _id once synced (see syncEngine.js).
 *
 * @param {"create"|"update"|"delete"} type
 * @param {object} payload - the note data (or { id } for deletes)
 * @param {string} tempId - for "create", the temporary local ID used
 *                          until the server assigns a real one
 */
export async function enqueueSync(type, payload, tempId = null) {
  const db = await getDb();
  return db.add(STORES.PENDING_SYNC, {
    type,
    payload,
    tempId,
    createdAt: Date.now(),
    attempts: 0,
  });
}

export async function getAllPendingSync() {
  const db = await getDb();
  return db.getAll(STORES.PENDING_SYNC);
}

export async function removePendingSync(queueId) {
  const db = await getDb();
  return db.delete(STORES.PENDING_SYNC, queueId);
}

export async function incrementSyncAttempt(queueId) {
  const db = await getDb();
  const item = await db.get(STORES.PENDING_SYNC, queueId);
  if (!item) return;
  item.attempts = (item.attempts || 0) + 1;
  return db.put(STORES.PENDING_SYNC, item);
}

export async function getPendingSyncCount() {
  const db = await getDb();
  return db.count(STORES.PENDING_SYNC);
}

// ── Meta store (lastSyncedAt, etc.) ───────────────────────────────────────────

export async function setMeta(key, value) {
  const db = await getDb();
  return db.put(STORES.META, { key, value });
}

export async function getMeta(key) {
  const db = await getDb();
  const row = await db.get(STORES.META, key);
  return row?.value;
}

// ── Generate a temporary client-side ID for offline-created notes ────────────
// Prefixed so it's visually obvious in DevTools and easy to detect/replace
// once the server assigns the real MongoDB ObjectId.
export function generateTempId() {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function isTempId(id) {
  return typeof id === "string" && id.startsWith("temp_");
}