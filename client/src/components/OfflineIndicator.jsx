// src/components/OfflineIndicator.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Small pill shown in the header — communicates connection + sync state:
//   - Online, nothing pending  → hidden entirely (no clutter when all is well)
//   - Online, syncing          → spinning icon, "Syncing…"
//   - Online, pending changes  → "3 changes waiting" (about to sync)
//   - Offline                  → red/amber "Offline — changes saved locally"
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { Wifi, WifiOff, RefreshCw, CloudOff } from "lucide-react";

const OfflineIndicator = ({ isOnline, syncStatus, pendingCount, onManualSync }) => {
  // Nothing to show when everything is settled
  if (isOnline && syncStatus === "idle" && pendingCount === 0) return null;

  let content;
  if (!isOnline) {
    content = (
      <>
        <WifiOff size={13} />
        <span>Offline — changes saved locally</span>
      </>
    );
  } else if (syncStatus === "syncing") {
    content = (
      <>
        <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
        <span>Syncing…</span>
      </>
    );
  } else if (pendingCount > 0) {
    content = (
      <>
        <CloudOff size={13} />
        <span>{pendingCount} change{pendingCount !== 1 ? "s" : ""} waiting to sync</span>
      </>
    );
  } else {
    content = (
      <>
        <Wifi size={13} />
        <span>Online</span>
      </>
    );
  }

  return (
    <button
      onClick={onManualSync}
      title="Click to sync now"
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 12px", borderRadius: 20,
        background: !isOnline ? "#fef2f2" : pendingCount > 0 ? "#fffbeb" : "#f0fdf4",
        color: !isOnline ? "#dc2626" : pendingCount > 0 ? "#d97706" : "#16a34a",
        border: `1px solid ${!isOnline ? "#fecaca" : pendingCount > 0 ? "#fde68a" : "#bbf7d0"}`,
        fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {content}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
};

export default OfflineIndicator;