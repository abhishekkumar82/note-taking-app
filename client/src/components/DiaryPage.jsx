// src/components/DiaryPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// All diary entry body text is now AES-GCM encrypted in the browser before
// being sent to the backend. The decryption key is derived from the user's
// PIN via PBKDF2 and never leaves the browser.
//
// Key changes vs old version:
//  • DiaryPage receives `cryptoKey` from DiaryPinGate via onUnlocked(key)
//  • handleSave   → encrypts body + title before POST/PUT
//  • fetchEntries → decrypts body + title after GET
//  • Entries that fail decryption show a visible warning instead of crashing
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import api from "../utils/axiosInstance";
import { encryptText, decryptText, isEncrypted } from "../utils/diaryEncryption";
import DiaryPinGate from "./DiaryPinGate";
import {
  BookOpen, Save, ChevronLeft, Bold, Italic, List, Heading1,
  Calendar, Clock, Trash2, Lock, Eye, EyeOff, Palette, Image as ImageIcon,
  CheckSquare, Code, Undo2, Redo2, FileDown, FileText, FileCode2,
  X, Pin, Search, Plus, ShieldCheck,
} from "lucide-react";
import "../index.css";

const MOODS = [
  { emoji: "😊", label: "Happy",      bg: "#fff9c4" },
  { emoji: "😌", label: "Calm",       bg: "#e8f5e9" },
  { emoji: "🎉", label: "Excited",    bg: "#fce4ec" },
  { emoji: "😢", label: "Sad",        bg: "#e3f2fd" },
  { emoji: "😡", label: "Angry",      bg: "#fbe9e7" },
  { emoji: "🤔", label: "Thoughtful", bg: "#f3e5f5" },
];

const DIARY_COLORS = [
  { bg: "#fffaf0", label: "Cream"        },
  { bg: "#f0fff0", label: "Mint"         },
  { bg: "#fff0f5", label: "Rose"         },
  { bg: "#f0f8ff", label: "Sky"          },
  { bg: "#fffde7", label: "Lemon"        },
  { bg: "#f3e5f5", label: "Lavender"     },
  { bg: "#e8f5e9", label: "Green"        },
  { bg: "#fce4ec", label: "Pink"         },
  { bg: "#e3f2fd", label: "Blue"         },
  { bg: "#1a1a2e", label: "Dark"         },
  { bg: "#2d1b69", label: "Purple Night" },
  { bg: "#0f2027", label: "Midnight"     },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── DiaryPage — top level (handles PIN gate + key passing) ────────────────────
const DiaryPage = ({ showToastMsg, userId }) => {
  const [cryptoKey, setCryptoKey] = useState(null);

  // Lock diary when component unmounts (navigation away)
  useEffect(() => () => setCryptoKey(null), []);

  if (!cryptoKey) {
    return (
      <DiaryPinGate
        userId={userId || "default"}
        onUnlocked={(key) => setCryptoKey(key)}
      />
    );
  }

  return <DiaryContent showToastMsg={showToastMsg} cryptoKey={cryptoKey} userId={userId} />;
};

// ── DiaryContent — the actual diary UI ───────────────────────────────────────
const DiaryContent = ({ showToastMsg, cryptoKey, userId }) => {
  const [entries,      setEntries]      = useState([]);
  const [title,        setTitle]        = useState("");
  const [selectedMood, setMood]         = useState(null);
  const [bgColor,      setBgColor]      = useState("#fffaf0");
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saveStatus,   setSaveStatus]   = useState("idle");
  const [viewMode,     setViewMode]     = useState("write");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [isPinned,     setIsPinned]     = useState(false);
  const [showExport,   setShowExport]   = useState(false);
  const fileRef = useRef();

  const today   = new Date();
  const dateStr = today.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = today.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const isDark  = ["#1a1a2e", "#2d1b69", "#0f2027"].includes(bgColor);

  const editor = useEditor({
    extensions: [StarterKit, Image, TaskList, TaskItem.configure({ nested: true })],
    content: "",
    onUpdate: () => {
      if (!editor) return;
      setSaveStatus("saving");
      clearTimeout(editor._draftTimer);
      editor._draftTimer = setTimeout(() => {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }, 1000);
    },
  });

  // ── Decrypt all entries after fetch ────────────────────────────────────────
  const decryptEntries = useCallback(async (raw) => {
    return Promise.all(raw.map(async (entry) => {
      try {
        const body  = await decryptText(entry.body  || "", cryptoKey);
        const title = await decryptText(entry.title || "", cryptoKey);
        return { ...entry, body, title };
      } catch {
        return { ...entry, body: "__DECRYPTION_FAILED__", title: entry.title };
      }
    }));
  }, [cryptoKey]);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res     = await api.get("/api/diary");
      const decrypted = await decryptEntries(res.data || []);
      setEntries(decrypted);
    } catch {
      showToastMsg?.("Failed to load diary entries", "error");
    } finally {
      setLoading(false);
    }
  }, [decryptEntries, showToastMsg]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // ── Save — encrypt before sending ─────────────────────────────────────────
  const handleSave = async () => {
    const bodyHtml = editor?.getHTML() || "";
    if (!title.trim() && bodyHtml === "<p></p>") {
      showToastMsg?.("Write something first ✍️", "error"); return;
    }
    try {
      setSaving(true);
      const [encBody, encTitle] = await Promise.all([
        encryptText(bodyHtml,                              cryptoKey),
        encryptText(title || `Entry — ${dateStr}`,        cryptoKey),
      ]);

      await api.post("/api/diary", {
        title:    encTitle,
        body:     encBody,
        color:    bgColor,
        mood:     selectedMood,
        isPinned,
        tags:     ["diary-entry"],
        folder:   "Personal Diary",
        isDiary:  true,
      });

      showToastMsg?.("📔 Entry saved & encrypted", "success");
      setTitle(""); setMood(null); setBgColor("#fffaf0"); setIsPinned(false);
      editor?.commands.clearContent();
      fetchEntries();
      setViewMode("entries");
    } catch {
      showToastMsg?.("Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Update existing entry — encrypt before sending ─────────────────────────
  const handleUpdate = async (entry, newBody) => {
    try {
      const [encBody, encTitle] = await Promise.all([
        encryptText(newBody,      cryptoKey),
        encryptText(entry.title,  cryptoKey),
      ]);
      await api.put(`/api/diary/${entry._id}`, {
        title:    encTitle,
        body:     encBody,
        color:    entry.color,
        mood:     entry.mood,
        isPinned: entry.isPinned,
      });
      await fetchEntries();
      showToastMsg?.("Entry updated", "success");
    } catch {
      showToastMsg?.("Update failed", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this diary entry?")) return;
    try {
      await api.delete(`/api/diary/${id}`);
      setEntries(p => p.filter(e => e._id !== id));
      showToastMsg?.("Entry deleted", "info");
      if (selectedEntry?._id === id) setViewMode("entries");
    } catch {
      showToastMsg?.("Delete failed", "error");
    }
  };

  const cleanText = (html) => {
    if (!html || html === "__DECRYPTION_FAILED__") return "";
    const d = document.createElement("div"); d.innerHTML = html; return d.innerText;
  };

  const exportAsPDF = async (entry) => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text(entry.title || "Diary Entry", 10, 10);
    doc.setFontSize(10); doc.text(new Date(entry.createdAt).toLocaleDateString(), 10, 18);
    doc.setFontSize(12); doc.text(doc.splitTextToSize(cleanText(entry.body || ""), 180), 10, 28);
    doc.save(`${entry.title || "diary"}.pdf`);
  };

  const exportAsMD = (entry) => {
    const blob = new Blob([`# ${entry.title}\n\n${cleanText(entry.body || "")}`], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${entry.title || "diary"}.md`; a.click();
  };

  const insertImage = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => editor?.chain().focus().setImage({ src: e.target.result }).run();
    reader.readAsDataURL(file);
  };

  const filteredEntries = entries.filter(e =>
    !searchTerm ||
    e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cleanText(e.body || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filteredEntries.reduce((acc, e) => {
    const d   = new Date(e.createdAt);
    const key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const moodBg = selectedMood ? MOODS.find(m => m.emoji === selectedMood)?.bg : null;

  return (
    <div className="diary-shell" style={{ "--diary-bg": moodBg || bgColor }}>

      {/* ── Left: Writing area ──────────────────────────────────────────── */}
      <div className="diary-write-col" style={{ background: moodBg || bgColor, color: isDark ? "#f1f5f9" : undefined }}>

        {/* Header */}
        <div className="diary-write-header">
          <div className="diary-write-date">
            <Calendar size={14} /><span>{dateStr}</span>
            <span className="diary-time"><Clock size={12} />{timeStr}</span>
          </div>
          {/* Encryption badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#22c55e", fontWeight: 600 }}>
            <ShieldCheck size={13} /> E2E Encrypted
          </div>
          <div className="diary-save-status">
            {saveStatus === "saving" && <span className="ds-saving">Saving…</span>}
            {saveStatus === "saved"  && <span className="ds-saved">Draft saved ✓</span>}
          </div>
        </div>

        {/* Title */}
        <input
          className="diary-title-input"
          placeholder="What's on your mind today?"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ color: isDark ? "#f1f5f9" : undefined }}
        />

        {/* Mood selector */}
        <div className="diary-mood-row">
          <span className="diary-mood-label" style={{ color: isDark ? "#94a3b8" : undefined }}>MOOD</span>
          <div className="diary-moods">
            {MOODS.map(m => (
              <button key={m.emoji}
                className={`diary-mood-btn ${selectedMood === m.emoji ? "active" : ""}`}
                onClick={() => setMood(selectedMood === m.emoji ? null : m.emoji)} title={m.label}>
                {m.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="diary-toolbar">
          <button onClick={() => editor?.chain().focus().toggleBold().run()}        className={editor?.isActive("bold")       ? "active" : ""}><Bold      size={14} /></button>
          <button onClick={() => editor?.chain().focus().toggleItalic().run()}      className={editor?.isActive("italic")     ? "active" : ""}><Italic    size={14} /></button>
          <button onClick={() => editor?.chain().focus().toggleHeading({level:2}).run()} className={editor?.isActive("heading") ? "active" : ""}><Heading1  size={14} /></button>
          <button onClick={() => editor?.chain().focus().toggleBulletList().run()}  className={editor?.isActive("bulletList") ? "active" : ""}><List      size={14} /></button>
          <button onClick={() => editor?.chain().focus().toggleTaskList().run()}>   <CheckSquare size={14} /></button>
          <button onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>  <Code        size={14} /></button>
          <span className="diary-tb-divider" />
          <button onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={14} /></button>
          <button onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={14} /></button>
        </div>

        {/* Editor */}
        <div className="diary-editor-wrap">
          <EditorContent editor={editor} />
        </div>

        {/* Bottom bar */}
        <div className="diary-write-footer">
          <div className="diary-footer-left">
            {/* Color picker */}
            <div className="diary-popover-wrap">
              <button className="diary-icon-btn" title="Background color" onClick={() => setShowColorPicker(v => !v)}>
                <Palette size={18} />
              </button>
              {showColorPicker && (
                <div className="diary-color-popover">
                  {DIARY_COLORS.map(c => (
                    <button key={c.bg}
                      className={`diary-cp-swatch ${bgColor === c.bg ? "active" : ""}`}
                      style={{ background: c.bg, border: bgColor === c.bg ? "2px solid #333" : "2px solid transparent" }}
                      title={c.label}
                      onClick={() => { setBgColor(c.bg); setShowColorPicker(false); }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Image upload */}
            <button className="diary-icon-btn" title="Add image" onClick={() => fileRef.current?.click()}>
              <ImageIcon size={18} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) insertImage(f); }} />

            {/* Pin */}
            <button className={`diary-icon-btn ${isPinned ? "active" : ""}`} title="Pin entry"
              onClick={() => setIsPinned(v => !v)}>
              <Pin size={18} fill={isPinned ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="diary-footer-right">
            <button className="diary-save-btn" onClick={handleSave} disabled={saving}>
              <Save size={16} />{saving ? "Encrypting & saving…" : "Save Entry"}
            </button>
            <button className="diary-view-btn" onClick={() => setViewMode(viewMode === "write" ? "entries" : "write")}>
              <BookOpen size={16} />{viewMode === "write" ? "Past Entries" : "Write"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: Entries panel ─────────────────────────────────────────── */}
      <div className={`diary-entries-col ${viewMode !== "write" ? "diary-entries-col--visible" : ""}`}>

        {viewMode === "read" && selectedEntry ? (
          <ReadView
            entry={selectedEntry}
            onBack={() => setViewMode("entries")}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            exportAsPDF={exportAsPDF}
            exportAsMD={exportAsMD}
            showExport={showExport}
            setShowExport={setShowExport}
            cleanText={cleanText}
          />
        ) : (
          <>
            {/* Header */}
            <div className="diary-entries-header">
              <BookOpen size={18} />
              <h3>Your Journal</h3>
              <span className="diary-entry-count">{entries.length} entries</span>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#22c55e", fontWeight: 600 }}>
                <ShieldCheck size={12} /> encrypted
              </span>
            </div>

            {/* Search */}
            <div className="diary-search-wrap">
              <Search size={14} className="diary-search-icon" />
              <input className="diary-search-input" placeholder="Search entries…"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              {searchTerm && <button onClick={() => setSearchTerm("")}><X size={13} /></button>}
            </div>

            {/* New entry shortcut */}
            <button className="diary-new-btn" onClick={() => setViewMode("write")}>
              <Plus size={14} /> New Entry
            </button>

            {loading ? (
              <div className="diary-loading">Decrypting entries…</div>
            ) : filteredEntries.length === 0 ? (
              <div className="diary-empty">
                <span>📔</span>
                <p>{searchTerm ? "No matching entries." : "No entries yet. Start writing!"}</p>
              </div>
            ) : (
              <div className="diary-timeline">
                {Object.entries(grouped).map(([month, monthEntries]) => (
                  <div key={month} className="diary-month-group">
                    <div className="diary-month-label">{month}</div>
                    {monthEntries.map(entry => {
                      const d = new Date(entry.createdAt);
                      const failed = entry.body === "__DECRYPTION_FAILED__";
                      return (
                        <div key={entry._id} className="diary-entry-card"
                          style={{ borderLeft: `3px solid ${entry.color || "#fffaf0"}`, opacity: failed ? 0.6 : 1 }}
                          onClick={() => !failed && (setSelectedEntry(entry), setViewMode("read"))}>
                          <div className="diary-entry-day">
                            <span className="dec-num">{d.getDate()}</span>
                            <span className="dec-weekday">{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                          </div>
                          <div className="diary-entry-info">
                            <div className="dei-top">
                              <span className="dei-title">{failed ? "⚠️ Decryption failed" : (entry.title || "Untitled entry")}</span>
                              {entry.mood   && <span className="dei-mood">{entry.mood}</span>}
                              {entry.isPinned && <Pin size={11} fill="currentColor" style={{ color: "#f59e0b" }} />}
                              <ShieldCheck size={10} style={{ color: "#22c55e", marginLeft: 2 }} />
                            </div>
                            <p className="dei-preview">
                              {failed ? "Wrong PIN or corrupted entry." : cleanText(entry.body || "").slice(0, 80) + "…"}
                            </p>
                          </div>
                          <button className="diary-entry-delete"
                            onClick={e => { e.stopPropagation(); handleDelete(entry._id); }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── ReadView — separate component to keep DiaryContent lean ──────────────────
const ReadView = ({ entry, onBack, onDelete, exportAsPDF, exportAsMD, showExport, setShowExport, cleanText }) => {
  const failed = entry.body === "__DECRYPTION_FAILED__";
  return (
    <div className="diary-read-view" style={{ background: entry.color || "#fffaf0" }}>
      <div className="diary-read-actions">
        <button className="diary-back-btn" onClick={onBack}><ChevronLeft size={16} /> Back</button>
        <div className="diary-read-btns">
          {!failed && (
            <div className="diary-popover-wrap">
              <button className="diary-icon-btn" onClick={() => setShowExport(v => !v)}>
                <FileDown size={16} />
              </button>
              {showExport && (
                <div className="diary-export-menu">
                  <button onClick={() => { exportAsPDF(entry); setShowExport(false); }}><FileText  size={13} /> PDF</button>
                  <button onClick={() => { exportAsMD(entry);  setShowExport(false); }}><FileCode2 size={13} /> Markdown</button>
                </div>
              )}
            </div>
          )}
          <button className="diary-icon-btn nc-btn--danger" onClick={() => onDelete(entry._id)}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="diary-read-date">
        {new Date(entry.createdAt).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        {entry.mood && <span className="diary-read-mood">{entry.mood}</span>}
        <span style={{ marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "#22c55e", fontWeight: 600 }}>
          <ShieldCheck size={11} /> encrypted
        </span>
      </div>

      <h2 className="diary-read-title">{entry.title || "Untitled"}</h2>

      {failed ? (
        <div style={{ padding: "24px", background: "#fef2f2", borderRadius: 12, color: "#dc2626", fontSize: 14 }}>
          ⚠️ This entry could not be decrypted. It may have been written with a different PIN.
        </div>
      ) : (
        <div className="diary-read-body" dangerouslySetInnerHTML={{ __html: entry.body }} />
      )}
    </div>
  );
};

export default DiaryPage;