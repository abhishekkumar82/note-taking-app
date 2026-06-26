// src/components/TemplatePickerModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shown when the user clicks "Take a note…" — lets them pick a starting
// template (or blank) before AddNote.jsx opens pre-filled.
//
// Rendered via Portal (same pattern as CollabShareModal) so it always
// displays above everything else regardless of where it's mounted.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { TEMPLATES } from "../data/noteTemplates";

const TemplatePickerModal = ({ onSelect, onClose }) => {
  const modalContent = (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.header}>
          <h3 style={S.title}>Start a new note</h3>
          <button type="button" style={S.closeBtn} onClick={onClose}><X size={18}/></button>
        </div>

        <div style={S.grid}>
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              type="button"
              style={S.card}
              onClick={() => onSelect(t)}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ ...S.cardSwatch, background: t.color !== "#ffffff" ? t.color : "#f1f5f9" }}>
                <span style={S.emoji}>{t.emoji}</span>
              </div>
              <div style={S.cardLabel}>{t.label}</div>
              <div style={S.cardDesc}>{t.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

const S = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
    backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 99999, padding: 16,
  },
  modal: {
    background: "#fff", borderRadius: 20, padding: "24px 26px 28px",
    width: "100%", maxWidth: 600, maxHeight: "85vh", overflowY: "auto",
    boxShadow: "0 24px 70px rgba(0,0,0,0.22)",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 18,
  },
  title: { fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.3px" },
  closeBtn: { background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, display: "flex" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 12,
  },
  card: {
    display: "flex", flexDirection: "column", alignItems: "flex-start",
    gap: 4, padding: 14, borderRadius: 14, border: "1.5px solid #e2e8f0",
    background: "#fff", cursor: "pointer", textAlign: "left",
    fontFamily: "inherit", transition: "transform .15s, box-shadow .15s",
  },
  cardSwatch: {
    width: "100%", height: 56, borderRadius: 10, display: "flex",
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  emoji: { fontSize: 26 },
  cardLabel: { fontSize: 13.5, fontWeight: 700, color: "#0f172a" },
  cardDesc: { fontSize: 11.5, color: "#64748b", lineHeight: 1.4 },
};

export default TemplatePickerModal;