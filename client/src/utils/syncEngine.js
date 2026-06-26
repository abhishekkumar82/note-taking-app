// src/utils/syncEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Drains the IndexedDB "pendingSync" queue against the real REST API whenever
// the browser is online. Also handles the reverse direction: pulling the
// server's current note list and merging it into IndexedDB, resolving any
// conflicts by comparing `updatedAt` timestamps (last-write-wins, but at the
// FIELD-SET level — i.e., whole-note granularity, which is the simplest
// correct strategy for a notes app).
//
// CONFLICT SCENARIO this handles:
//   1. User edits Note A offline at 10:00am (saved locally, queued for sync)
//   2. User edits the SAME note from another device at 10:05am (synced to
//      Mongo immediately, since that device was online)
//   3. First device reconnects at 10:10am and tries to push its queued edit
//   4. We detect: local queued edit's `updatedAt` (10:00am) is OLDER than
//      the server's current `updatedAt` (10:05am) → the server version wins,
//      we discard the stale local edit and notify the user via a toast
//      instead of silently overwriting newer data with stale data.
//
// This is "eventual consistency" with last-write-wins conflict resolution —
// simple to reason about, and correct for a single-user notes app where
// true concurrent multi-device editing of the SAME note is rare (and when
// it does happen, surfacing a "your offline edit was outdated" toast is
// far better than silently losing data either direction).
// ─────────────────────────────────────────────────────────────────────────────

import api from "./axiosInstance";
import {
  getAllPendingSync,
  removePendingSync,
  incrementSyncAttempt,
  putLocalNote,
  deleteLocalNote,
  getLocalNote,
  putLocalNotes,
  getAllLocalNotes,
  setMeta,
  isTempId,
} from "./db";

const MAX_ATTEMPTS = 5;

let syncing = false;
let listeners = []; // callbacks notified on sync events: { type, detail }

export function onSyncEvent(callback) {
  listeners.push(callback);
  return () => { listeners = listeners.filter(l => l !== callback); };
}

function emit(type, detail = {}) {
  listeners.forEach(l => {
    try { l({ type, detail }); } catch (e) { console.error("[sync] listener error", e); }
  });
}

/**
 * Drain the pending sync queue — push every queued create/update/delete
 * to the real server, in order, handling conflicts and reconciling temp IDs.
 */
export async function flushPendingSync() {
  if (syncing) return; // avoid overlapping flush calls
  if (!navigator.onLine) return;

  syncing = true;
  emit("sync:start");

  try {
    const queue = await getAllPendingSync();
    // Process in the order they were created, so edits to the same note
    // apply in the right sequence.
    queue.sort((a, b) => a.createdAt - b.createdAt);

    for (const item of queue) {
      try {
        await processQueueItem(item);
        await removePendingSync(item.queueId);
      } catch (err) {
        console.error("[sync] failed to process item", item.queueId, err.message);
        await incrementSyncAttempt(item.queueId);
        if ((item.attempts || 0) + 1 >= MAX_ATTEMPTS) {
          // Give up on this item after repeated failures (e.g. permanently
          // invalid payload) — drop it so it doesn't block the rest of the
          // queue forever. Surface this to the user.
          await removePendingSync(item.queueId);
          emit("sync:item-dropped", { item, error: err.message });
        }
        // For transient errors (network blip mid-flush), leave it queued —
        // next flush call will retry.
      }
    }

    await setMeta("lastSyncedAt", Date.now());
    emit("sync:complete");
  } finally {
    syncing = false;
  }
}

async function processQueueItem(item) {
  const { type, payload, tempId } = item;

  if (type === "create") {
    const res = await api.post("/api/dashboard/add", payload);
    const serverNote = res.data;

    // Reconcile: the note was stored locally under a temp ID; now that the
    // server has assigned a real MongoDB _id, swap it in IndexedDB.
    if (tempId) {
      await deleteLocalNote(tempId);
    }
    await putLocalNote(serverNote);
    emit("sync:id-reconciled", { tempId, realId: serverNote._id });
  }

  else if (type === "update") {
    const { id, ...fields } = payload;

    // Skip update calls for notes still carrying a temp ID — they haven't
    // been created on the server yet. This can happen if the user edits a
    // note they JUST created offline, before the "create" item synced.
    // Safe to skip: the "create" queue item already carries the LATEST
    // local state of the note (see noteSync.js below), so there's nothing
    // additional to push.
    if (isTempId(id)) return;

    // ── Conflict check ──────────────────────────────────────────────────
    // Fetch the server's current version of this note before overwriting.
    let serverNote = null;
    try {
      const res = await api.get(`/api/dashboard/item/${id}`);
      serverNote = res.data;
    } catch {
      // If the GET-single endpoint doesn't exist in your API, this falls
      // through and we just push the update — see note below.
    }

    if (serverNote && serverNote.updatedAt) {
      const localUpdatedAt = new Date(fields.updatedAt || item.createdAt).getTime();
      const serverUpdatedAt = new Date(serverNote.updatedAt).getTime();

      if (serverUpdatedAt > localUpdatedAt) {
        // Server has a NEWER version than what we queued offline — the
        // server wins. Pull its version into IndexedDB instead of pushing
        // our stale edit, and tell the user.
        await putLocalNote(serverNote);
        emit("sync:conflict-resolved", {
          noteId: id,
          resolution: "server-won",
          title: serverNote.title,
        });
        return; // don't push the stale local edit
      }
    }

    const res = await api.put(`/api/dashboard/item/${id}`, fields);
    await putLocalNote(res.data);
  }

  else if (type === "delete") {
    const { id } = payload;
    if (isTempId(id)) {
      // Was never created on the server — just remove locally, nothing to sync.
      await deleteLocalNote(id);
      return;
    }
    await api.delete(`/api/dashboard/item-delete/${id}`);
    // Soft-delete on server; mirror locally by marking isDeleted rather
    // than physically removing, so trash view still works offline.
    const local = await getLocalNote(id);
    if (local) await putLocalNote({ ...local, isDeleted: true });
  }
}

/**
 * Pull the latest notes from the server and merge into IndexedDB.
 * Called on app load (when online) and after reconnecting.
 * Server data wins for any note NOT currently in the pending queue
 * (i.e., no local unsynced edit exists for it).
 */
export async function pullFromServer() {
  if (!navigator.onLine) return;

  try {
    const res = await api.get("/api/dashboard");
    const serverNotes = res.data?.notes || [];

    const pendingQueue = await getAllPendingSync();
    const pendingNoteIds = new Set(
      pendingQueue
        .filter(i => i.type === "update" || i.type === "delete")
        .map(i => i.payload.id)
    );

    // Don't clobber notes that have a pending local edit not yet flushed —
    // flushPendingSync() will reconcile those via the conflict check above.
    const safeToOverwrite = serverNotes.filter(n => !pendingNoteIds.has(n._id));
    await putLocalNotes(safeToOverwrite);

    emit("sync:pulled", { count: safeToOverwrite.length });
    return serverNotes;
  } catch (err) {
    console.error("[sync] pullFromServer failed:", err.message);
    return null;
  }
}

/**
 * Full sync cycle: push pending changes, then pull fresh server state.
 * This is what gets called on "online" events and on a periodic timer.
 */
export async function fullSync() {
  await flushPendingSync();
  await pullFromServer();
}

/**
 * Get all notes for display — ALWAYS reads from IndexedDB (instant,
 * works offline). Call pullFromServer()/fullSync() separately to refresh
 * the local cache when online.
 */
export async function getNotesForDisplay() {
  const all = await getAllLocalNotes();
  return all.filter(n => !n.isDeleted);
}