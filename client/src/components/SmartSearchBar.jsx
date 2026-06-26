// src/components/SmartSearchBar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in replacement for the <form className="search-form"> block inside
// Header.jsx. Adds a toggle between:
//   - "Keyword" search  → your original POST /api/dashboard/search (regex)
//   - "Smart" search    → NEW POST /api/search/semantic (embeddings)
//
// In Smart mode, results show a match-confidence badge (e.g. "82% match")
// and a short content snippet, since semantic hits often don't share any
// literal words with the query — the snippet helps the user see WHY a
// result matched.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from "react";
import { Search, Sparkles, X, Loader2 } from "lucide-react";
import api from "../utils/axiosInstance";

const SmartSearchBar = ({ onSearch, onSemanticResults }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [mode, setMode]             = useState("keyword"); // "keyword" | "smart"
  const [loading, setLoading]       = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [smartResults, setSmartResults] = useState([]);
  const wrapRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search — behavior depends on mode
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchTerm.trim()) {
        onSearch(null, "");
        setSmartResults([]);
        setShowDropdown(false);
        return;
      }

      setLoading(true);
      try {
        if (mode === "keyword") {
          const res = await api.post("/api/dashboard/search", { searchTerm });
          onSearch(res.data.searchResults, searchTerm);
          setShowDropdown(false);
        } else {
          // Smart mode shows results in a dropdown preview (with match %)
          // rather than replacing the whole notes grid, since semantic
          // results benefit from seeing the snippet + score for context.
          const res = await api.post("/api/search/semantic", { query: searchTerm });
          setSmartResults(res.data.results || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("[search] failed:", err.message);
        setSmartResults([]);
      } finally {
        setLoading(false);
      }
    }, mode === "smart" ? 600 : 400); // slightly longer debounce for smart (more expensive)

    return () => clearTimeout(timer);
  }, [searchTerm, mode]);

  const clear = () => {
    setSearchTerm("");
    onSearch(null, "");
    setSmartResults([]);
    setShowDropdown(false);
  };

  const applySmartResultsToGrid = () => {
    // Pushes the smart results into the main notes grid (same shape your
    // NoteCard expects) instead of just showing them in the dropdown.
    onSemanticResults?.(smartResults, searchTerm);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapRef} style={S.wrap}>
      <form onSubmit={e => e.preventDefault()} style={S.formRow}>
        <div style={S.inputWrap}>
          {loading
            ? <Loader2 size={17} style={{ ...S.icon, animation: "ssb-spin 0.8s linear infinite" }} />
            : <Search size={17} style={S.icon} />}
          <input
            type="text"
            placeholder={mode === "smart" ? "Search by meaning… e.g. 'things about my car'" : "Search your notes…"}
            style={S.input}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onFocus={() => { if (mode === "smart" && smartResults.length) setShowDropdown(true); }}
          />
          {searchTerm && (
            <button type="button" onClick={clear} style={S.clearBtn}><X size={14} /></button>
          )}
        </div>

        {/* Mode toggle */}
        <button
          type="button"
          onClick={() => setMode(m => m === "keyword" ? "smart" : "keyword")}
          title={mode === "smart" ? "Smart search (AI) — click for keyword mode" : "Keyword search — click for AI smart search"}
          style={{ ...S.modeBtn, ...(mode === "smart" ? S.modeBtnActive : {}) }}
        >
          <Sparkles size={14} />
          {mode === "smart" ? "Smart" : "Keyword"}
        </button>
      </form>

      <style>{`@keyframes ssb-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Smart-mode results dropdown */}
      {showDropdown && mode === "smart" && (
        <div style={S.dropdown}>
          {smartResults.length === 0 ? (
            <div style={S.emptyState}>
              No conceptually related notes found. Try different phrasing.
            </div>
          ) : (
            <>
              <div style={S.dropdownHeader}>
                <Sparkles size={12} /> {smartResults.length} result{smartResults.length !== 1 ? "s" : ""} by meaning
              </div>
              {smartResults.map(r => (
                <div key={r._id} style={S.resultRow}>
                  <div style={{ ...S.colorDot, background: r.color !== "#ffffff" ? r.color : "#e2e8f0" }} />
                  <div style={S.resultBody}>
                    <div style={S.resultTitleRow}>
                      <span style={S.resultTitle}>{r.title || "Untitled"}</span>
                      <span style={S.matchBadge}>{r.matchScore}% match</span>
                    </div>
                    <p style={S.resultSnippet}>{r.snippet}{r.snippet?.length >= 160 ? "…" : ""}</p>
                  </div>
                </div>
              ))}
              <button type="button" style={S.viewAllBtn} onClick={applySmartResultsToGrid}>
                View all {smartResults.length} in notes grid →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const S = {
  wrap:     { position: "relative", flex: 1, maxWidth: 520 },
  formRow:  { display: "flex", gap: 8, alignItems: "center" },
  inputWrap:{ position: "relative", flex: 1, display: "flex", alignItems: "center" },
  icon:     { position: "absolute", left: 12, color: "var(--text-muted, #94a3b8)", pointerEvents: "none" },
  input:    {
    width: "100%", padding: "0.75rem 2.5rem 0.75rem 2.75rem",
    background: "var(--bg-light, #f8fafc)", border: "1px solid var(--border-color, #e2e8f0)",
    borderRadius: 12, fontSize: "0.95rem", outline: "none", color: "var(--text-main, #1e293b)",
    fontFamily: "inherit",
  },
  clearBtn: { position: "absolute", right: 10, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" },
  modeBtn: {
    display: "flex", alignItems: "center", gap: 5, padding: "8px 12px",
    borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff",
    color: "#64748b", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
    whiteSpace: "nowrap", transition: "all .15s",
  },
  modeBtnActive: {
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderColor: "transparent", color: "#fff",
  },
  dropdown: {
    position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
    boxShadow: "0 12px 40px rgba(0,0,0,0.14)", maxHeight: 420, overflowY: "auto",
    zIndex: 500, padding: 8,
  },
  dropdownHeader: {
    display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700,
    color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.04em",
    padding: "6px 10px 10px",
  },
  emptyState: { padding: "24px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 },
  resultRow:  { display: "flex", gap: 10, padding: "10px", borderRadius: 10, cursor: "default", transition: "background .12s" },
  colorDot:   { width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0 },
  resultBody: { flex: 1, minWidth: 0 },
  resultTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 3 },
  resultTitle: { fontSize: 13.5, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  matchBadge: {
    fontSize: 10.5, fontWeight: 700, color: "#16a34a", background: "#f0fdf4",
    border: "1px solid #bbf7d0", padding: "1px 7px", borderRadius: 10, flexShrink: 0,
  },
  resultSnippet: { fontSize: 12, color: "#64748b", lineHeight: 1.5, margin: 0 },
  viewAllBtn: {
    width: "100%", marginTop: 6, padding: "9px", borderRadius: 10, border: "none",
    background: "#eef2ff", color: "#4f46e5", fontWeight: 700, fontSize: 12.5,
    cursor: "pointer", fontFamily: "inherit",
  },
};

export default SmartSearchBar;