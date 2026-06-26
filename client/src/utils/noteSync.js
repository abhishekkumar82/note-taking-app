// src/utils/noteSync.js
// ─────────────────────────────────────────────────────────────────────────────
// Offline-aware note operations. Dashboard.jsx calls THESE instead of `api`
// directly for create/update/delete, so every write:
//   1. Applies to IndexedDB immediately (UI updates instantly, works offline)
//   2. Either syncs to the server right away (if online) or gets queued
//      (if offline) for syncEngine.js to replay later.
// ─────────────────────────────────────────────────────────────────────────────

import api from "./axiosInstance";
import {
  putLocalNote,
  deleteLocalNote,
  enqueueSync,
  generateTempId,
} from "./db";
import { flushPendingSync } from "./syncEngine";

/**
 * Create a note. Returns the note immediately (with a temp ID if offline,
 * or the real server ID if online and the request succeeds).
 */
export async function createNoteOffline(noteData) {
  if (navigator.onLine) {
    try {
      const res = await api.post("/api/dashboard/add", noteData);
      await putLocalNote(res.data);
      return res.data;
    } catch (err) {
      // Network technically reported online but the request still failed
      // (e.g. server down) — fall through to offline path below.
      console.warn("[noteSync] online create failed, queuing instead:", err.message);
    }
  }

  // Offline path: assign a temp ID, store locally, queue for later sync.
  const tempId = generateTempId();
  const localNote = {
    ...noteData,
    _id: tempId,
    isDeleted: false,
    isArchived: noteData.isArchived || false,
    isPinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await putLocalNote(localNote);
  await enqueueSync("create", noteData, tempId);
  return localNote;
}

/**
 * Update a note. Applies locally immediately; syncs now if online, else queues.
 */
export async function updateNoteOffline(id, fields) {
  const updatedAt = new Date().toISOString();

  if (navigator.onLine) {
    try {
      const res = await api.put(`/api/dashboard/item/${id}`, fields);
      await putLocalNote(res.data);
      return res.data;
    } catch (err) {
      console.warn("[noteSync] online update failed, queuing instead:", err.message);
    }
  }

  // Offline (or request failed): merge into local copy + queue
  const { getLocalNote } = await import("./db");
  const existing = await getLocalNote(id);
  const merged = { ...existing, ...fields, updatedAt };
  await putLocalNote(merged);
  await enqueueSync("update", { id, ...fields, updatedAt });
  return merged;
}

/**
 * Delete (soft-delete) a note.
 */
export async function deleteNoteOffline(id) {
  if (navigator.onLine) {
    try {
      await api.delete(`/api/dashboard/item-delete/${id}`);
      const { getLocalNote } = await import("./db");
      const existing = await getLocalNote(id);
      if (existing) await putLocalNote({ ...existing, isDeleted: true });
      return;
    } catch (err) {
      console.warn("[noteSync] online delete failed, queuing instead:", err.message);
    }
  }

  const { getLocalNote } = await import("./db");
  const existing = await getLocalNote(id);
  if (existing) await putLocalNote({ ...existing, isDeleted: true });
  await enqueueSync("delete", { id });
}

/**
 * Convenience: try to flush the queue immediately after any write, in case
 * we just came back online but the 'online' event hasn't fired a sync yet.
 */
export async function trySyncNow() {
  if (navigator.onLine) {
    await flushPendingSync();
  }
}