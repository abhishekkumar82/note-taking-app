import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import api from "../utils/axiosInstance";
import TaskItem from "@tiptap/extension-task-item";
import {
  BookOpen, Save, ChevronLeft, Bold, Italic, List, Heading1,
  Calendar, Clock, Trash2, Lock, Eye, EyeOff, Palette, Image as ImageIcon,
  CheckSquare, Code, Undo2, Redo2, FileDown, FileText, FileCode2,
  Share2, X, Pin, Search, Plus
} from "lucide-react";
import "../index.css";
import DiaryPinGate from "./DiaryPinGate";
const MOODS = [
  { emoji: "😊", label: "Happy",      bg: "#fff9c4" },
  { emoji: "😌", label: "Calm",       bg: "#e8f5e9" },
  { emoji: "🎉", label: "Excited",    bg: "#fce4ec" },
  { emoji: "😢", label: "Sad",        bg: "#e3f2fd" },
  { emoji: "😡", label: "Angry",      bg: "#fbe9e7" },
  { emoji: "🤔", label: "Thoughtful", bg: "#f3e5f5" },
];

const DIARY_COLORS = [
  { bg: "#fffaf0", label: "Cream" },
  { bg: "#f0fff0", label: "Mint" },
  { bg: "#fff0f5", label: "Rose" },
  { bg: "#f0f8ff", label: "Sky" },
  { bg: "#fffde7", label: "Lemon" },
  { bg: "#f3e5f5", label: "Lavender" },
  { bg: "#e8f5e9", label: "Green" },
  { bg: "#fce4ec", label: "Pink" },
  { bg: "#e3f2fd", label: "Blue" },
  { bg: "#1a1a2e", label: "Dark" },
  { bg: "#2d1b69", label: "Purple Night" },
  { bg: "#0f2027", label: "Midnight" },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const hashPin = (pin) => {
  let h = 5381;
  for (let i = 0; i < pin.length; i++) { h = ((h << 5) + h) + pin.charCodeAt(i); h = h & h; }
  return h.toString(16);
};

// ── PIN Gate ──────────────────────────────────────────────────────────────────
const PinGate = ({ userId, onUnlocked }) => {
  const key    = `diary_pin_${userId}`;
  const hasPin = !!localStorage.getItem(key);
  const [mode, setMode]     = useState(hasPin ? "enter" : "set");
  const [pin, setPin]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError]   = useState("");
  const [shake, setShake]   = useState(false);

  const trigShake = () => { setShake(true); setTimeout(() => setShake(false), 400); };

  const doSet = () => {
    if (pin.length < 4) { setError("PIN must be at least 4 characters"); return; }
    setMode("confirm"); setError("");
  };
  const doConfirm = () => {
    if (pin !== confirm) { setError("PINs do not match"); setConfirm(""); trigShake(); return; }
    localStorage.setItem(key, hashPin(pin)); onUnlocked();
  };
  const doEnter = () => {
    if (hashPin(pin) === localStorage.getItem(key)) { onUnlocked(); }
    else { setError("Wrong PIN. Try again."); setPin(""); trigShake(); }
  };
  const doForgot = () => {
    if (window.confirm("Reset your diary PIN? Entries are NOT deleted.")) {
      localStorage.removeItem(key); setMode("set"); setPin(""); setError("");
    }
  };

  return (
    <div className="diary-pin-overlay">
      <div className={`diary-pin-card ${shake ? "shake" : ""}`}>
        <div className="diary-pin-icon"><Lock size={32}/></div>
        {mode === "set" && (
          <>
            <h2>Set Diary PIN</h2>
            <p className="diary-pin-subtitle">Protect your personal diary with a PIN.</p>
            <div className="diary-pin-input-wrap">
              <input type={showPin?"text":"password"} className="diary-pin-input" placeholder="Enter new PIN"
                value={pin} onChange={e=>{setPin(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&doSet()} autoFocus/>
              <button className="diary-pin-eye" onClick={()=>setShowPin(v=>!v)}>
                {showPin?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
            {error && <p className="diary-pin-error">{error}</p>}
            <button className="diary-pin-btn" onClick={doSet}>Set PIN →</button>
          </>
        )}
        {mode === "confirm" && (
          <>
            <h2>Confirm PIN</h2>
            <div className="diary-pin-input-wrap">
              <input type={showPin?"text":"password"} className="diary-pin-input" placeholder="Confirm PIN"
                value={confirm} onChange={e=>{setConfirm(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&doConfirm()} autoFocus/>
              <button className="diary-pin-eye" onClick={()=>setShowPin(v=>!v)}>
                {showPin?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
            {error && <p className="diary-pin-error">{error}</p>}
            <button className="diary-pin-btn" onClick={doConfirm}>Confirm & Open</button>
            <button className="diary-pin-back" onClick={()=>{setMode("set");setConfirm("");setError("");}}>← Back</button>
          </>
        )}
        {mode === "enter" && (
          <>
            <h2>Personal Diary</h2>
            <p className="diary-pin-subtitle">Enter your PIN to unlock.</p>
            <div className="diary-pin-input-wrap">
              <input type={showPin?"text":"password"} className="diary-pin-input" placeholder="Enter PIN"
                value={pin} onChange={e=>{setPin(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&doEnter()} autoFocus/>
              <button className="diary-pin-eye" onClick={()=>setShowPin(v=>!v)}>
                {showPin?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
            {error && <p className="diary-pin-error">{error}</p>}
            <button className="diary-pin-btn" onClick={doEnter}>Unlock 🔓</button>
            <button className="diary-pin-forgot" onClick={doForgot}>Forgot PIN?</button>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main DiaryPage ────────────────────────────────────────────────────────────
const DiaryPage = ({ showToastMsg, userId }) => {
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => () => setUnlocked(false), []);
  if (!unlocked) return <DiaryPinGate userId={userId || "default"} onUnlocked={() => setUnlocked(true)} />;
  return <DiaryContent showToastMsg={showToastMsg} />;
};

// ── DiaryContent ──────────────────────────────────────────────────────────────
const DiaryContent = ({ showToastMsg }) => {
  const [entries, setEntries]         = useState([]);
  const [title, setTitle]             = useState("");
  const [selectedMood, setMood]       = useState(null);
  const [bgColor, setBgColor]         = useState("#fffaf0");
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saveStatus, setSaveStatus]   = useState("idle");
  const [viewMode, setViewMode]       = useState("write");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [searchTerm, setSearchTerm]   = useState("");
  const [isPinned, setIsPinned]       = useState(false);
  const [showExport, setShowExport]   = useState(false);
  const fileRef = useRef();

  const today   = new Date();
  const dateStr = today.toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const timeStr = today.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });

  const isDark = ["#1a1a2e","#2d1b69","#0f2027"].includes(bgColor);

  const editor = useEditor({
    extensions: [StarterKit, Image, TaskList, TaskItem.configure({ nested: true })],
    content: "",
    onUpdate: () => {
      if (!editor) return;
      setSaveStatus("saving");
      clearTimeout(editor._draftTimer);
      editor._draftTimer = setTimeout(() => {
        const body = editor.getHTML();
        if (!title && body === "<p></p>") return;
        localStorage.setItem("diary_draft", JSON.stringify({ title, body, mood: selectedMood, bgColor, isPinned }));
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }, 1000);
    },
  });

  // Restore draft
  useEffect(() => {
    if (!editor) return;
    const draft = localStorage.getItem("diary_draft");
    if (draft) {
      try {
        const { title: t, body: b, mood: m, bgColor: c, isPinned: p } = JSON.parse(draft);
        setTitle(t || ""); setMood(m || null); setBgColor(c || "#fffaf0"); setIsPinned(p || false);
        editor.commands.setContent(b || "");
      } catch {}
    }
  }, [editor]);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch ONLY diary entries using the dedicated diary API endpoint
      const res = await api.get("/api/diary");
      setEntries(res.data || []);
    } catch {
      // Fallback: filter from notes by diary tag/folder
      try {
        const res = await axios.get("http://localhost:9090/api/dashboard", { withCredentials: true });
        const diaryOnly = (res.data.notes || []).filter(n =>
          n.folder === "Personal Diary" || n.tags?.includes("diary-entry")
        );
        setEntries(diaryOnly);
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSave = async () => {
    const body = editor?.getHTML() || "";
    if (!title.trim() && body === "<p></p>") {
      showToastMsg?.("Write something first ✍️", "error"); return;
    }
    try {
      setSaving(true);
      // Save to dedicated diary endpoint (keeps it separate from Notes)
      await axios.post("http://localhost:9090/api/diary", {
        title: title || `Entry — ${dateStr}`,
        body,
        color: bgColor,
        mood: selectedMood,
        isPinned,
        tags: ["diary-entry"],    // internal tag — NOT shown in Notes
        folder: "Personal Diary", // dedicated folder
        isDiary: true,            // flag for backend filtering
      }, { withCredentials: true });

      showToastMsg?.("📔 Entry saved", "success");
      setTitle(""); setMood(null); setBgColor("#fffaf0"); setIsPinned(false);
      editor?.commands.clearContent();
      localStorage.removeItem("diary_draft");
      fetchEntries();
      setViewMode("entries");
    } catch {
      showToastMsg?.("Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this diary entry?")) return;
    try {
      await axios.delete(`http://localhost:9090/api/diary/${id}`, { withCredentials: true });
      setEntries(p => p.filter(e => e._id !== id));
      showToastMsg?.("Entry deleted", "info");
      if (selectedEntry?._id === id) setViewMode("entries");
    } catch {}
  };

  const cleanText = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d.innerText; };

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
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${entry.title || "diary"}.md`; a.click();
  };

  const insertImage = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => editor?.chain().focus().setImage({ src: e.target.result }).run();
    reader.readAsDataURL(file);
  };

  const filteredEntries = entries.filter(e =>
    !searchTerm || e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cleanText(e.body || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filteredEntries.reduce((acc, e) => {
    const d = new Date(e.createdAt);
    const key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const moodBg = selectedMood ? MOODS.find(m => m.emoji === selectedMood)?.bg : null;

  return (
    <div className="diary-shell" style={{ "--diary-bg": moodBg || bgColor }}>

      {/* ── Left: Writing area ─────────────────────────── */}
      <div className="diary-write-col" style={{ background: moodBg || bgColor, color: isDark ? "#f1f5f9" : undefined }}>

        {/* Header */}
        <div className="diary-write-header">
          <div className="diary-write-date">
            <Calendar size={14}/><span>{dateStr}</span>
            <span className="diary-time"><Clock size={12}/>{timeStr}</span>
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
              <button key={m.emoji} className={`diary-mood-btn ${selectedMood === m.emoji ? "active" : ""}`}
                onClick={() => setMood(selectedMood === m.emoji ? null : m.emoji)} title={m.label}>
                {m.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="diary-toolbar">
          <button onClick={() => editor?.chain().focus().toggleBold().run()}
            className={editor?.isActive("bold") ? "active" : ""}><Bold size={14}/></button>
          <button onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={editor?.isActive("italic") ? "active" : ""}><Italic size={14}/></button>
          <button onClick={() => editor?.chain().focus().toggleHeading({level:2}).run()}
            className={editor?.isActive("heading") ? "active" : ""}><Heading1 size={14}/></button>
          <button onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={editor?.isActive("bulletList") ? "active" : ""}><List size={14}/></button>
          <button onClick={() => editor?.chain().focus().toggleTaskList().run()}><CheckSquare size={14}/></button>
          <button onClick={() => editor?.chain().focus().toggleCodeBlock().run()}><Code size={14}/></button>
          <span className="diary-tb-divider"/>
          <button onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={14}/></button>
          <button onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={14}/></button>
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
              <button className="diary-icon-btn" title="Background color"
                onClick={() => setShowColorPicker(v => !v)}>
                <Palette size={18}/>
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
              <ImageIcon size={18}/>
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) insertImage(f); }}/>

            {/* Pin */}
            <button className={`diary-icon-btn ${isPinned ? "active" : ""}`} title="Pin entry"
              onClick={() => setIsPinned(v => !v)}>
              <Pin size={18} fill={isPinned ? "currentColor" : "none"}/>
            </button>
          </div>

          <div className="diary-footer-right">
            <button className="diary-save-btn" onClick={handleSave} disabled={saving}>
              <Save size={16}/>{saving ? "Saving…" : "Save Entry"}
            </button>
            <button className="diary-view-btn"
              onClick={() => setViewMode(viewMode === "write" ? "entries" : "write")}>
              <BookOpen size={16}/>{viewMode === "write" ? "Past Entries" : "Write"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: Entries panel ─────────────────────────── */}
      <div className={`diary-entries-col ${viewMode !== "write" ? "diary-entries-col--visible" : ""}`}>

        {viewMode === "read" && selectedEntry ? (
          <div className="diary-read-view" style={{ background: selectedEntry.color || "#fffaf0" }}>
            <div className="diary-read-actions">
              <button className="diary-back-btn" onClick={() => setViewMode("entries")}>
                <ChevronLeft size={16}/> Back
              </button>
              <div className="diary-read-btns">
                {/* Export */}
                <div className="diary-popover-wrap">
                  <button className="diary-icon-btn" onClick={() => setShowExport(v => !v)}>
                    <FileDown size={16}/>
                  </button>
                  {showExport && (
                    <div className="diary-export-menu">
                      <button onClick={() => { exportAsPDF(selectedEntry); setShowExport(false); }}>
                        <FileText size={13}/> PDF
                      </button>
                      <button onClick={() => { exportAsMD(selectedEntry); setShowExport(false); }}>
                        <FileCode2 size={13}/> Markdown
                      </button>
                    </div>
                  )}
                </div>
                <button className="diary-icon-btn nc-btn--danger"
                  onClick={() => handleDelete(selectedEntry._id)}>
                  <Trash2 size={15}/>
                </button>
              </div>
            </div>

            <div className="diary-read-date">
              {new Date(selectedEntry.createdAt).toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
              {selectedEntry.mood && <span className="diary-read-mood">{selectedEntry.mood}</span>}
            </div>
            <h2 className="diary-read-title">{selectedEntry.title}</h2>
            <div className="diary-read-body" dangerouslySetInnerHTML={{ __html: selectedEntry.body }} />
          </div>

        ) : (
          <>
            {/* Header */}
            <div className="diary-entries-header">
              <BookOpen size={18}/>
              <h3>Your Journal</h3>
              <span className="diary-entry-count">{entries.length} entries</span>
            </div>

            {/* Search */}
            <div className="diary-search-wrap">
              <Search size={14} className="diary-search-icon"/>
              <input
                className="diary-search-input"
                placeholder="Search entries…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && <button onClick={() => setSearchTerm("")}><X size={13}/></button>}
            </div>

            {/* New entry shortcut */}
            <button className="diary-new-btn" onClick={() => setViewMode("write")}>
              <Plus size={14}/> New Entry
            </button>

            {loading ? (
              <div className="diary-loading">Loading…</div>
            ) : filteredEntries.length === 0 ? (
              <div className="diary-empty"><span>📔</span><p>{searchTerm ? "No matching entries." : "No entries yet. Start writing!"}</p></div>
            ) : (
              <div className="diary-timeline">
                {Object.entries(grouped).map(([month, monthEntries]) => (
                  <div key={month} className="diary-month-group">
                    <div className="diary-month-label">{month}</div>
                    {monthEntries.map(entry => {
                      const d = new Date(entry.createdAt);
                      return (
                        <div key={entry._id} className="diary-entry-card"
                          style={{ borderLeft: `3px solid ${entry.color || "#fffaf0"}` }}
                          onClick={() => { setSelectedEntry(entry); setViewMode("read"); }}>
                          <div className="diary-entry-day">
                            <span className="dec-num">{d.getDate()}</span>
                            <span className="dec-weekday">{d.toLocaleDateString("en-IN",{weekday:"short"})}</span>
                          </div>
                          <div className="diary-entry-info">
                            <div className="dei-top">
                              <span className="dei-title">{entry.title || "Untitled entry"}</span>
                              {entry.mood && <span className="dei-mood">{entry.mood}</span>}
                              {entry.isPinned && <Pin size={11} fill="currentColor" style={{color:"#f59e0b"}}/>}
                            </div>
                            <p className="dei-preview">{cleanText(entry.body || "").slice(0, 80)}…</p>
                          </div>
                          <button className="diary-entry-delete"
                            onClick={e => { e.stopPropagation(); handleDelete(entry._id); }}>
                            <Trash2 size={13}/>
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

export default DiaryPage;
