// src/components/NaturalLanguageReminderInput.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Smart reminder input: user types natural language like
//   "remind me every Monday at 9am"
//   "tomorrow evening"
//   "next Friday at 3:30 PM"
// and we parse it with chrono-node into a Date + recurrence rule.
//
// Props:
//   reminder        – ISO string or "" (controlled)
//   repeat          – "none" | "daily" | "weekly" (controlled)
//   onChangeReminder(isoString)
//   onChangeRepeat(repeatValue)
//   onClose()
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from "react";
import * as chrono from "chrono-node";
import { Bell, X, Clock, CheckCircle, AlertCircle } from "lucide-react";

// ── Recurrence keywords → repeat value ──────────────────────────────────────
// We scan the raw input text for these patterns BEFORE handing it to chrono,
// since chrono strips recurrence language and only returns the next occurrence.
const RECURRENCE_PATTERNS = [
  { pattern: /every\s+day|daily|each\s+day/i,                     repeat: "daily"  },
  { pattern: /every\s+week|weekly|each\s+week/i,                   repeat: "weekly" },
  { pattern: /every\s+(mon|tue|wed|thu|fri|sat|sun)\w*/i,         repeat: "weekly" },
  { pattern: /every\s+monday/i,    repeat: "weekly" },
  { pattern: /every\s+tuesday/i,   repeat: "weekly" },
  { pattern: /every\s+wednesday/i, repeat: "weekly" },
  { pattern: /every\s+thursday/i,  repeat: "weekly" },
  { pattern: /every\s+friday/i,    repeat: "weekly" },
  { pattern: /every\s+saturday/i,  repeat: "weekly" },
  { pattern: /every\s+sunday/i,    repeat: "weekly" },
  { pattern: /every\s+morning/i,   repeat: "daily"  },
  { pattern: /every\s+evening/i,   repeat: "daily"  },
  { pattern: /every\s+night/i,     repeat: "daily"  },
];

// ── Time-of-day shorthands chrono doesn't handle perfectly ──────────────────
const TIME_SHORTHANDS = {
  "morning":   "09:00",
  "afternoon": "14:00",
  "evening":   "18:00",
  "night":     "21:00",
  "noon":      "12:00",
  "midnight":  "00:00",
};

function expandShorthands(text) {
  let expanded = text;
  for (const [word, time] of Object.entries(TIME_SHORTHANDS)) {
    // Replace "morning" → "9am" etc. only when not already next to a time
    expanded = expanded.replace(new RegExp(`\\b${word}\\b`, "gi"), `at ${time}`);
  }
  return expanded;
}

function detectRepeat(text) {
  for (const { pattern, repeat } of RECURRENCE_PATTERNS) {
    if (pattern.test(text)) return repeat;
  }
  return "none";
}

function parseNaturalDate(text) {
  if (!text.trim()) return null;
  const expanded = expandShorthands(text);
  const results  = chrono.parse(expanded, new Date(), { forwardDate: true });
  if (!results.length) return null;
  return results[0].start.date();
}

// ── Quick suggestion chips ────────────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  { label: "In 30 min",           text: "in 30 minutes"              },
  { label: "This evening",        text: "today at 6pm"               },
  { label: "Tomorrow morning",    text: "tomorrow at 9am"            },
  { label: "Every morning",       text: "every morning at 9am"       },
  { label: "Every Monday 9am",    text: "every Monday at 9am"        },
  { label: "Next week",           text: "next Monday at 9am"         },
];

function formatParsedDate(date) {
  if (!date) return null;
  const now = new Date();
  const diff = date - now;
  const mins = Math.round(diff / 60000);
  const hrs  = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);

  const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });

  if (mins < 60)  return `in ${mins} min — ${timeStr}`;
  if (hrs  < 24)  return `today at ${timeStr}`;
  if (days === 1) return `tomorrow at ${timeStr}`;
  if (days < 7)   return `${dateStr} at ${timeStr}`;
  return `${dateStr} at ${timeStr}`;
}

// ── Main component ────────────────────────────────────────────────────────────
const NaturalLanguageReminderInput = ({
  reminder,
  repeat,
  onChangeReminder,
  onChangeRepeat,
  onClose,
}) => {
  const [text,       setText]       = useState("");
  const [parsed,     setParsed]     = useState(null);   // Date | null
  const [detectedR,  setDetectedR]  = useState("none"); // repeat from NL
  const [status,     setStatus]     = useState("idle"); // "idle"|"ok"|"error"
  const [focused,    setFocused]    = useState(false);
  const inputRef = useRef();

  // Initialise text from existing reminder prop
  useEffect(() => {
    if (reminder) {
      const d = new Date(reminder);
      const iso = d.toISOString().slice(0, 16);
      // Show a human date rather than ISO in the input
      setText(d.toLocaleString("en-IN", {
        weekday: "short", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      }));
      setParsed(d);
      setStatus("ok");
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!text.trim()) {
      setParsed(null);
      setStatus("idle");
      setDetectedR("none");
      return;
    }
    const date = parseNaturalDate(text);
    const rep  = detectRepeat(text);
    if (date) {
      setParsed(date);
      setDetectedR(rep);
      setStatus("ok");
    } else {
      setParsed(null);
      setDetectedR("none");
      setStatus(text.length > 3 ? "error" : "idle");
    }
  }, [text]);

  const handleApply = () => {
    if (!parsed) return;
    onChangeReminder(parsed.toISOString().slice(0, 16));
    onChangeRepeat(detectedR);
    onClose();
  };

  const handleClear = () => {
    setText("");
    setParsed(null);
    setStatus("idle");
    setDetectedR("none");
    onChangeReminder("");
    onChangeRepeat("none");
  };

  const handleSuggestion = (suggText) => {
    setText(suggText);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && parsed) handleApply();
    if (e.key === "Escape") onClose();
  };

  return (
    <div style={S.wrap} onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <Bell size={14} style={{ color: "#6366f1" }} />
          <span style={S.headerTitle}>Set reminder</span>
        </div>
        <button style={S.closeBtn} onClick={onClose} type="button">
          <X size={14} />
        </button>
      </div>

      {/* Main input */}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          autoFocus
          type="text"
          placeholder='Try "remind me every Monday at 9am"…'
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...S.input,
            borderColor: status === "ok"    ? "#22c55e"
                        : status === "error" ? "#ef4444"
                        : focused            ? "#6366f1"
                        : "#e2e8f0",
          }}
        />
        {text && (
          <button
            type="button"
            style={S.inputClear}
            onClick={() => { setText(""); inputRef.current?.focus(); }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Parse feedback */}
      {status === "ok" && parsed && (
        <div style={S.parsedPill}>
          <CheckCircle size={13} style={{ color: "#16a34a", flexShrink: 0 }} />
          <span style={S.parsedText}>
            <strong>Reminder:</strong> {formatParsedDate(parsed)}
            {detectedR !== "none" && (
              <span style={S.repeatBadge}>
                ↻ {detectedR}
              </span>
            )}
          </span>
        </div>
      )}

      {status === "error" && (
        <div style={S.errorPill}>
          <AlertCircle size={13} style={{ color: "#dc2626", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#dc2626" }}>
            Couldn't parse that — try "tomorrow at 3pm" or pick below
          </span>
        </div>
      )}

      {/* Quick suggestions */}
      <div style={S.suggestions}>
        {QUICK_SUGGESTIONS.map(s => (
          <button
            key={s.text}
            type="button"
            style={S.chip}
            onClick={() => handleSuggestion(s.text)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Manual override — date+time pickers */}
      <details style={S.details}>
        <summary style={S.detailsSummary}>
          <Clock size={11} /> Pick date & time manually
        </summary>
        <div style={S.manualRow}>
          <input
            type="date"
            style={S.manualInput}
            value={parsed ? parsed.toISOString().split("T")[0] : ""}
            onChange={e => {
              const existing = parsed || new Date();
              const [y, mo, d] = e.target.value.split("-").map(Number);
              const next = new Date(existing);
              next.setFullYear(y, mo - 1, d);
              setParsed(next);
              setStatus("ok");
              setText(next.toLocaleString("en-IN", {
                weekday: "short", month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              }));
            }}
          />
          <input
            type="time"
            style={S.manualInput}
            value={parsed ? parsed.toTimeString().slice(0, 5) : ""}
            onChange={e => {
              const existing = parsed || new Date();
              const [h, m]   = e.target.value.split(":").map(Number);
              const next     = new Date(existing);
              next.setHours(h, m, 0, 0);
              setParsed(next);
              setStatus("ok");
              setText(next.toLocaleString("en-IN", {
                weekday: "short", month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              }));
            }}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <label style={S.repeatLabel}>Repeat</label>
          <select
            style={S.repeatSelect}
            value={detectedR}
            onChange={e => setDetectedR(e.target.value)}
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </details>

      {/* Action buttons */}
      <div style={S.actions}>
        <button type="button" style={S.clearBtn2} onClick={handleClear}>
          Remove
        </button>
        <button
          type="button"
          style={{ ...S.applyBtn, opacity: parsed ? 1 : 0.45, cursor: parsed ? "pointer" : "default" }}
          onClick={handleApply}
          disabled={!parsed}
        >
          Set reminder
        </button>
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  wrap: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    zIndex: 999,
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 14,
    padding: "14px 14px 12px",
    width: 320,
    boxShadow: "0 12px 40px rgba(0,0,0,0.14)",
    fontFamily: "'Inter','Segoe UI',sans-serif",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 10,
  },
  headerLeft:  { display: "flex", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 13, fontWeight: 700, color: "#0f172a" },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#94a3b8", display: "flex", padding: 2, borderRadius: 4,
  },
  input: {
    width: "100%",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    padding: "9px 32px 9px 12px",
    fontSize: 13,
    fontFamily: "inherit",
    color: "#0f172a",
    background: "#fafafa",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color .15s",
  },
  inputClear: {
    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer", color: "#94a3b8",
    display: "flex", padding: 2,
  },
  parsedPill: {
    display: "flex", alignItems: "flex-start", gap: 6,
    background: "#f0fdf4", border: "1px solid #bbf7d0",
    borderRadius: 8, padding: "7px 10px", marginTop: 8,
  },
  parsedText: { fontSize: 12, color: "#15803d", lineHeight: 1.5 },
  repeatBadge: {
    display: "inline-block", marginLeft: 6,
    background: "#dcfce7", color: "#166534",
    fontSize: 10, fontWeight: 700,
    padding: "1px 6px", borderRadius: 10,
  },
  errorPill: {
    display: "flex", alignItems: "center", gap: 6,
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: 8, padding: "7px 10px", marginTop: 8,
  },
  suggestions: {
    display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10,
  },
  chip: {
    padding: "4px 9px", border: "1px solid #e2e8f0", borderRadius: 20,
    background: "#f8fafc", color: "#475569",
    fontSize: 11.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
    transition: "all .12s",
  },
  details: { marginTop: 10 },
  detailsSummary: {
    fontSize: 12, color: "#6366f1", fontWeight: 600, cursor: "pointer",
    display: "flex", alignItems: "center", gap: 4,
    listStyle: "none", outline: "none",
  },
  manualRow: { display: "flex", gap: 8, marginTop: 8 },
  manualInput: {
    flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 8,
    padding: "7px 8px", fontSize: 12, fontFamily: "inherit",
    color: "#0f172a", background: "#fafafa", outline: "none",
  },
  repeatLabel: { fontSize: 11.5, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 },
  repeatSelect: {
    width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8,
    padding: "7px 8px", fontSize: 12, fontFamily: "inherit",
    color: "#0f172a", background: "#fafafa", outline: "none",
  },
  actions: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9",
  },
  clearBtn2: {
    background: "none", border: "none", cursor: "pointer",
    color: "#ef4444", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
    padding: 0,
  },
  applyBtn: {
    padding: "8px 16px", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    color: "#fff", fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
    transition: "opacity .15s",
  },
};

export default NaturalLanguageReminderInput;
