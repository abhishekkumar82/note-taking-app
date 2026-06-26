// src/components/CommandPalette.jsx
// Pure overlay — renders NOTHING when closed. No floating trigger button.
// The ⌘K button lives in Header.jsx's user-nav (see Header_changes.jsx).
// Open via: Ctrl+K / Cmd+K globally, or from the Header command button.

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search, Folder, Bell, Archive, Trash2, Lock,
  BarChart2, BookOpen, Lightbulb, Plus, Pin, Hash,
  X, ChevronRight, FileText,
} from "lucide-react";

function fuzzyMatch(query, target) {
  if (!query) return { matched: true, score: 0, ranges: [] };
  const q = query.toLowerCase(), t = target.toLowerCase();
  const exactIdx = t.indexOf(q);
  if (exactIdx !== -1) return { matched: true, score: 100 - exactIdx, ranges: [[exactIdx, exactIdx + q.length - 1]] };
  let qi = 0, score = 0, rangeStart = -1;
  const ranges = [];
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (rangeStart === -1) rangeStart = ti;
      score += ti === qi ? 2 : 1; qi++;
    } else if (rangeStart !== -1) { ranges.push([rangeStart, ti - 1]); rangeStart = -1; }
  }
  if (rangeStart !== -1) ranges.push([rangeStart, target.length - 1]);
  return { matched: qi === q.length, score, ranges };
}

function HighlightedText({ text, ranges = [] }) {
  if (!ranges.length) return <span>{text}</span>;
  const parts = []; let cursor = 0;
  for (const [s, e] of ranges) {
    if (s > cursor) parts.push({ t: text.slice(cursor, s), hl: false });
    parts.push({ t: text.slice(s, e + 1), hl: true }); cursor = e + 1;
  }
  if (cursor < text.length) parts.push({ t: text.slice(cursor), hl: false });
  return <span>{parts.map((p, i) => p.hl ? <mark key={i} style={{ background: "transparent", color: "#6366f1", fontWeight: 700, padding: 0 }}>{p.t}</mark> : <span key={i}>{p.t}</span>)}</span>;
}

const ACTIONS = [
  { id: "nav-notes",     label: "Go to Notes",            icon: Lightbulb, section: "notes"     },
  { id: "nav-reminders", label: "Go to Reminders",        icon: Bell,      section: "reminders" },
  { id: "nav-diary",     label: "Open Diary",             icon: BookOpen,  section: "diary"     },
  { id: "nav-habits",    label: "Open Habit Tracker",     icon: BarChart2, section: "habits"    },
  { id: "nav-archived",  label: "View Archive",           icon: Archive,   section: "archived"  },
  { id: "nav-trash",     label: "Open Trash",             icon: Trash2,    section: "trash"     },
  { id: "nav-locked",    label: "Locked Notes",           icon: Lock,      section: "locked"    },
  { id: "new-note",      label: "New Note",               icon: Plus,      action: "new-note",  kbd: "N" },
  { id: "new-template",  label: "New Note from Template", icon: FileText,  action: "template"   },
];

const CommandPalette = ({ notes = [], onNavigate, onOpenNote, onNewNote, onOpenTemplate, openSignal = 0 }) => {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const [selIdx, setSel]  = useState(0);
  const inputRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    const handler = (e) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(v => !v); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) { setQuery(""); setSel(0); setTimeout(() => inputRef.current?.focus(), 10); }
  }, [open]);

  useEffect(() => {
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);

  const close = useCallback(() => { setOpen(false); setQuery(""); setSel(0); }, []);

  const results = useMemo(() => {
    const q = query.trim(); const items = [];
    if (!q) {
      const recent = [...notes].filter(n => !n.isDeleted && !n.isArchived && !n.isDiary)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
      if (recent.length) { items.push({ type: "label", label: "Recent Notes", id: "g-r" }); recent.forEach(n => items.push({ type: "note", note: n, ranges: [] })); }
      items.push({ type: "label", label: "Actions", id: "g-a" });
      ACTIONS.forEach(a => items.push({ type: "action", action: a, ranges: [] }));
      return items;
    }
    const nm = [];
    for (const note of notes) {
      if (note.isDeleted) continue;
      const tm = fuzzyMatch(q, note.title || "");
      const tagHit = (note.tags || []).some(t => fuzzyMatch(q, t).matched);
      const fm = fuzzyMatch(q, note.folder || "");
      if (tm.matched || tagHit || fm.matched)
        nm.push({ type: "note", note, ranges: tm.ranges, score: Math.max(tm.matched ? tm.score + 10 : 0, tagHit ? 5 : 0, fm.matched ? fm.score : 0) });
    }
    nm.sort((a, b) => b.score - a.score);
    if (nm.length) { items.push({ type: "label", label: `Notes (${nm.length})`, id: "g-n" }); items.push(...nm.slice(0, 8)); }
    const am = ACTIONS.map(a => { const m = fuzzyMatch(q, a.label); return m.matched ? { type: "action", action: a, ranges: m.ranges, score: m.score } : null; }).filter(Boolean);
    am.sort((a, b) => b.score - a.score);
    if (am.length) { items.push({ type: "label", label: "Actions", id: "g-ac" }); items.push(...am); }
    return items;
  }, [query, notes]);

  const selectables = useMemo(() => results.filter(r => r.type !== "label"), [results]);

  const handleKey = useCallback((e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(i => Math.min(i + 1, selectables.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const it = selectables[selIdx]; if (it) exec(it); }
    else if (e.key === "Escape") close();
  }, [selectables, selIdx]);

  useEffect(() => { itemRefs.current[selIdx]?.scrollIntoView({ block: "nearest" }); }, [selIdx]);
  useEffect(() => { setSel(0); }, [query]);

  const exec = useCallback((item) => {
    if (item.type === "note") { onOpenNote?.(item.note); close(); }
    else if (item.type === "action") {
      const a = item.action;
      if (a.section)               { onNavigate?.(a.section); close(); }
      if (a.action === "new-note") { onNewNote?.(); close(); }
      if (a.action === "template") { onOpenTemplate?.(); close(); }
    }
  }, [onNavigate, onOpenNote, onNewNote, onOpenTemplate, close]);

  if (!open) return null;

  let sc = -1;

  return createPortal(
    <div className="cp-overlay" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="cp-panel">
        <div className="cp-search-row">
          <Search size={18} className="cp-search-icon" />
          <input ref={inputRef} className="cp-input" placeholder="Search notes or run a command…"
            value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
            autoComplete="off" spellCheck={false} />
          {query && <button className="cp-clear-btn" onClick={() => { setQuery(""); inputRef.current?.focus(); }}><X size={14} /></button>}
          <kbd className="cp-esc-kbd" onClick={close}>esc</kbd>
        </div>

        <div className="cp-list">
          {results.length === 0 && (
            <div className="cp-empty">
              <Search size={26} style={{ opacity: 0.2, marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>No results for <strong>"{query}"</strong></p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#cbd5e1" }}>Try a note title, tag, or folder</p>
            </div>
          )}
          {results.map((item) => {
            if (item.type === "label") return <div key={item.id} className="cp-group-label">{item.label}</div>;
            sc++; const si = sc; const sel = selIdx === si;
            if (item.type === "note") {
              const n = item.note;
              return (
                <div key={n._id} ref={el => { itemRefs.current[si] = el; }}
                  className={`cp-item${sel ? " cp-item--selected" : ""}`}
                  onClick={() => exec(item)} onMouseEnter={() => setSel(si)}>
                  <div className="cp-note-dot" style={{ background: (n.color && n.color !== "#ffffff") ? n.color : "#e2e8f0" }} />
                  <div className="cp-item-body">
                    <div className="cp-item-title-row">
                      <span className="cp-item-title"><HighlightedText text={n.title || "Untitled"} ranges={item.ranges} /></span>
                      {n.isPinned && <Pin size={11} style={{ color: "#f59e0b", flexShrink: 0 }} />}
                    </div>
                    <div className="cp-item-meta">
                      {n.folder && n.folder !== "General" && <span className="cp-meta-chip"><Folder size={10} /> {n.folder}</span>}
                      {(n.tags || []).slice(0, 3).map(t => <span key={t} className="cp-tag-chip"><Hash size={9} />{t}</span>)}
                    </div>
                  </div>
                  {sel && <ChevronRight size={14} style={{ color: "#6366f1", flexShrink: 0 }} />}
                </div>
              );
            }
            if (item.type === "action") {
              const a = item.action; const Icon = a.icon;
              return (
                <div key={a.id} ref={el => { itemRefs.current[si] = el; }}
                  className={`cp-item${sel ? " cp-item--selected" : ""}`}
                  onClick={() => exec(item)} onMouseEnter={() => setSel(si)}>
                  <div className="cp-action-icon"><Icon size={14} style={{ color: sel ? "#6366f1" : "#64748b" }} /></div>
                  <div className="cp-item-body">
                    <span className="cp-item-title"><HighlightedText text={a.label} ranges={item.ranges} /></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {a.kbd && <kbd className="cp-kbd">{a.kbd}</kbd>}
                    {sel && <ChevronRight size={14} style={{ color: "#6366f1" }} />}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        <div className="cp-footer">
          <span className="cp-footer-hint"><kbd className="cp-kbd-sm">↑↓</kbd> navigate</span>
          <span className="cp-footer-hint"><kbd className="cp-kbd-sm">↵</kbd> open</span>
          <span className="cp-footer-hint"><kbd className="cp-kbd-sm">esc</kbd> close</span>
          <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#94a3b8" }}>{selectables.length} result{selectables.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CommandPalette;
