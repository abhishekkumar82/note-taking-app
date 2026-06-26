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
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 8px 28px rgba(99,102,241,0.14)";
                e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)";
                e.currentTarget.style.borderColor = "#f0f0f0";
              }}
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
    position: "fixed", inset: 0,
    background: "rgba(15,23,42,0.55)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 99999, padding: 16,
  },
  modal: {
    background: "#fff", borderRadius: 24, padding: "28px 28px 32px",
    width: "100%", maxWidth: 640, maxHeight: "88vh", overflowY: "auto",
    boxShadow: "0 24px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.04)",
    animation: "scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
    fontFamily: "'Inter','Poppins',sans-serif",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 22,
  },
  title: {
    fontSize: 19, fontWeight: 800, color: "#111827", margin: 0,
    letterSpacing: "-0.4px",
  },
  closeBtn: {
    background: "#f3f4f6", border: "none", cursor: "pointer",
    color: "#9ca3af", padding: "6px", display: "flex",
    borderRadius: "50%", width: 32, height: 32,
    alignItems: "center", justifyContent: "center",
    transition: "background .15s",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(158px, 1fr))",
    gap: 14,
  },
  card: {
    display: "flex", flexDirection: "column", alignItems: "flex-start",
    gap: 6, padding: "14px 14px 16px", borderRadius: 16,
    border: "1.5px solid #f0f0f0",
    background: "#fff", cursor: "pointer", textAlign: "left",
    fontFamily: "inherit",
    transition: "transform .2s cubic-bezier(0.34,1.56,0.64,1), box-shadow .2s, border-color .15s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
  },
  cardSwatch: {
    width: "100%", height: 60, borderRadius: 12, display: "flex",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emoji: { fontSize: 28 },
  cardLabel: { fontSize: 13.5, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" },
  cardDesc: { fontSize: 11.5, color: "#6b7280", lineHeight: 1.45 },
};

export default TemplatePickerModal;