// src/hooks/useOfflineSync.js
// ─────────────────────────────────────────────────────────────────────────────
// Wires the sync engine into React: tracks online/offline status, triggers
// a full sync whenever the browser reconnects, runs a periodic background
// sync while online (catches edge cases like a flaky connection that never
// fires a clean "offline" event), and exposes pending-queue count + status
// for UI indicators (e.g. "3 changes waiting to sync").
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fullSync,
  flushPendingSync,
  pullFromServer,
  onSyncEvent,
} from "../utils/syncEngine";
import { getPendingSyncCount } from "../utils/db";

const PERIODIC_SYNC_MS = 30000; // re-attempt sync every 30s while online, as a safety net

export function useOfflineSync({ showToastMsg } = {}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | error
  const [pendingCount, setPendingCount] = useState(0);
  const intervalRef = useRef(null);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingSyncCount();
    setPendingCount(count);
  }, []);

  // ── Initial load + periodic safety-net sync ─────────────────────────────────
  useEffect(() => {
    refreshPendingCount();

    if (navigator.onLine) {
      fullSync().then(refreshPendingCount);
    }

    intervalRef.current = setInterval(() => {
      if (navigator.onLine) flushPendingSync().then(refreshPendingCount);
    }, PERIODIC_SYNC_MS);

    return () => clearInterval(intervalRef.current);
  }, [refreshPendingCount]);

  // ── Online/offline browser events ─────────────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      showToastMsg?.("🟢 Back online — syncing changes…", "info");
      await fullSync();
      await refreshPendingCount();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToastMsg?.("📴 You're offline — changes will sync when reconnected", "info");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showToastMsg, refreshPendingCount]);

  // ── Sync engine event listeners (conflicts, drops, completion) ──────────────
  useEffect(() => {
    const unsubscribe = onSyncEvent(({ type, detail }) => {
      if (type === "sync:start") setSyncStatus("syncing");
      if (type === "sync:complete") { setSyncStatus("idle"); refreshPendingCount(); }
      if (type === "sync:conflict-resolved") {
        showToastMsg?.(
          `⚠️ "${detail.title}" was edited elsewhere — kept the newer version`,
          "info"
        );
      }
      if (type === "sync:item-dropped") {
        showToastMsg?.("⚠️ A change failed to sync after several attempts", "error");
      }
    });
    return unsubscribe;
  }, [showToastMsg, refreshPendingCount]);

  const manualSync = useCallback(async () => {
    if (!navigator.onLine) {
      showToastMsg?.("Can't sync — you're offline", "error");
      return;
    }
    await fullSync();
    await refreshPendingCount();
  }, [showToastMsg, refreshPendingCount]);

  return { isOnline, syncStatus, pendingCount, manualSync, refreshPendingCount };
}