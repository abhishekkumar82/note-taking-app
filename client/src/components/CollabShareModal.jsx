// src/components/CollabShareModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIX: Rendered via React Portal directly into document.body.
// Previously this modal rendered as a child of NoteCard, whose `.nc-card`
// has `overflow: hidden` + `position: relative` — that clipped/trapped the
// "fixed" overlay inside the card's small box instead of covering the
// whole screen, which is why buttons looked broken/unclickable.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Users, Copy, Check, X, Clock } from "lucide-react";
import api from "../utils/axiosInstance";

const CollabShareModal = ({ noteId, onClose }) => {
  const [loading, setLoading]   = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [permission, setPermission] = useState("edit");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [copied, setCopied]     = useState(false);
  const [error, setError]       = useState("");

  const startSession = async () => {
    setLoading(true); setError("");
    try {
      const res = await api.post(`/api/collab/start/${noteId}`, {
        permission,
        expiresInHours: expiresInHours || null,
      });
      setShareUrl(res.data.shareUrl);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start collaboration");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modalContent = (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.header}>
          <div style={S.headerLeft}>
            <Users size={18} style={{ color: "#6366f1" }} />
            <h3 style={S.title}>Live Collaboration</h3>
          </div>
          <button type="button" style={S.closeBtn} onClick={onClose}><X size={16}/></button>
        </div>

        {!shareUrl ? (
          <>
            <p style={S.desc}>
              Generate a link that lets others edit this note with you in real time —
              changes appear instantly for everyone.
            </p>

            <div style={S.field}>
              <label style={S.label}>Permission</label>
              <div style={S.toggleRow}>
                <button
                  type="button"
                  style={{ ...S.toggleBtn, ...(permission === "edit" ? S.toggleActive : {}) }}
                  onClick={() => setPermission("edit")}
                >Can edit</button>
                <button
                  type="button"
                  style={{ ...S.toggleBtn, ...(permission === "view" ? S.toggleActive : {}) }}
                  onClick={() => setPermission("view")}
                >View only</button>
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label}><Clock size={12}/> Link expires in</label>
              <select
                style={S.select}
                value={expiresInHours}
                onChange={e => setExpiresInHours(Number(e.target.value))}
              >
                <option value={1}>1 hour</option>
                <option value={24}>24 hours</option>
                <option value={168}>7 days</option>
                <option value={0}>Never</option>
              </select>
            </div>

            {error && <div style={S.error}>{error}</div>}

            <button type="button" style={S.primaryBtn} onClick={startSession} disabled={loading}>
              {loading ? "Creating link…" : "Start collaborating →"}
            </button>
          </>
        ) : (
          <>
            <p style={S.desc}>Share this link — anyone who opens it joins the live session instantly.</p>
            <div style={S.linkRow}>
              <input readOnly value={shareUrl} style={S.linkInput} onClick={e => e.target.select()} />
              <button type="button" style={S.copyBtn} onClick={copy}>
                {copied ? <Check size={15}/> : <Copy size={15}/>}
              </button>
            </div>
            <p style={S.hint}>
              {permission === "edit" ? "Collaborators can edit this note." : "Collaborators can only view."}
              {expiresInHours ? ` Link expires in ${expiresInHours}h.` : " Link never expires."}
            </p>
          </>
        )}
      </div>
    </div>
  );

  // Portal escapes NoteCard's `overflow:hidden` + stacking context entirely,
  // rendering directly under <body> so `position: fixed` works as expected.
  return createPortal(modalContent, document.body);
};

const S = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,          // raised — must beat header (1000), sidebar (1100/300), toasts (9999)
    padding: 16,
  },
  modal: {
    background: "#fff",
    borderRadius: 18,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  headerLeft: { display: "flex", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, display: "flex" },
  desc: { fontSize: 13, color: "#64748b", marginBottom: 18, lineHeight: 1.5 },
  field: { marginBottom: 14 },
  label: { display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 },
  toggleRow: { display: "flex", gap: 6 },
  toggleBtn: { flex: 1, padding: "8px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fafafa", fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer" },
  toggleActive: { borderColor: "#6366f1", background: "#eef2ff", color: "#6366f1" },
  select: { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, color: "#0f172a", background: "#fafafa" },
  error: { background: "#fef2f2", color: "#dc2626", fontSize: 12.5, padding: "8px 12px", borderRadius: 8, marginBottom: 12 },
  primaryBtn: { width: "100%", padding: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" },
  linkRow: { display: "flex", gap: 8, marginBottom: 10 },
  linkInput: { flex: 1, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12.5, color: "#374151", background: "#f8fafc" },
  copyBtn: { padding: "0 14px", borderRadius: 8, border: "none", background: "#1e293b", color: "#fff", cursor: "pointer" },
  hint: { fontSize: 11.5, color: "#94a3b8" },
};

export default CollabShareModal;