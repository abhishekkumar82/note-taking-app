// src/components/AddNote.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CHANGE: ReminderPopover replaced with <NaturalLanguageReminderInput>
// Everything else is identical to the original.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useRef, useEffect } from "react";
import "../index.css";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import AIToolsPanel from "./AIToolsPanel";
import { createNoteOffline } from "../utils/noteSync";
import NaturalLanguageReminderInput from "./NaturalLanguageReminderInput"; // ← NEW
import {
  Bell, Palette, Image as ImageIcon, CheckSquare,
  Code, Save, Undo2, Redo2, Archive, X,
  Bold, Italic, Heading1, List, ChevronDown
} from "lucide-react";
import api from "../utils/axiosInstance";

// ── Color Picker (unchanged) ──────────────────────────────────────────────────
const COLORS = [
  { bg: "#ffffff", label: "Default"  },
  { bg: "#f28b82", label: "Tomato"   },
  { bg: "#fbbc04", label: "Flamingo" },
  { bg: "#fff475", label: "Canary"   },
  { bg: "#ccff90", label: "Sage"     },
  { bg: "#a7ffeb", label: "Mint"     },
  { bg: "#cbf0f8", label: "Denim"    },
  { bg: "#aecbfa", label: "Sky"      },
  { bg: "#d7aefb", label: "Grape"    },
  { bg: "#fdcfe8", label: "Blush"    },
  { bg: "#e6c9a8", label: "Sand"     },
  { bg: "#e8eaed", label: "Graphite" },
];

const ColorPicker = ({ color, onChange, onClose }) => (
  <div className="an-color-popover">
    <div className="an-cp-grid">
      {COLORS.map(c => (
        <button
          key={c.bg}
          className={`an-cp-swatch ${color === c.bg ? "an-cp-swatch--active" : ""}`}
          style={{ background: c.bg }}
          title={c.label}
          onClick={() => { onChange(c.bg); onClose(); }}
        />
      ))}
    </div>
  </div>
);

// ── AddNote ───────────────────────────────────────────────────────────────────
const AddNote = ({ onNoteAdded, folders, showToastMsg, initialTemplate }) => {
  const [title, setTitle]           = useState("");
  const [color, setColor]           = useState("#ffffff");
  const [tags, setTags]             = useState("");
  const [folder, setFolder]         = useState("General");
  const [reminder, setReminder]     = useState("");
  const [repeat, setRepeat]         = useState("none");
  const [showReminder, setShowReminder] = useState(false); // ← now opens NL input
  const [showColor, setShowColor]   = useState(false);
  const [expanded, setExpanded]     = useState(false);
  const fileRef = useRef();

  const safeFolders = useMemo(() => {
    if (!Array.isArray(folders)) return ["General"];
    const names = folders.map(f => (typeof f === "string" ? f : f?.name || null)).filter(Boolean);
    return [...new Set(names.length ? names : ["General"])];
  }, [folders]);

  const editor = useEditor({
    extensions: [StarterKit, Image, TaskList, TaskItem.configure({ nested: true })],
    content: "",
    onFocus: () => setExpanded(true),
  });

  // Apply template once on mount
  useEffect(() => {
    if (!initialTemplate || initialTemplate.id === "blank") return;
    setTitle(initialTemplate.title || "");
    setColor(initialTemplate.color || "#ffffff");
    setFolder(initialTemplate.folder || "General");
    setTags((initialTemplate.tags || []).join(", "));
    setExpanded(true);
    if (editor && initialTemplate.body) {
      editor.commands.setContent(initialTemplate.body);
    }
  }, [initialTemplate, editor]); // eslint-disable-line

  const insertImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => editor?.chain().focus().setImage({ src: e.target.result }).run();
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e, isVoice = false, archive = false) => {
    if (!isVoice && e) e.preventDefault();
    const body = editor?.getHTML() || "";
    try {
      const tagArray = tags.split(",").map(t => t.trim()).filter(Boolean);
      if (tagArray.length === 0) {
        showToastMsg?.("Please add at least one tag", "error");
        return;
      }
      const newNote = await createNoteOffline({
        title, body, color,
        tags: tagArray.map(t => t.toLowerCase()),
        folder, reminder, repeat,
        isArchived: archive,
      });
      onNoteAdded(newNote);
      showToastMsg?.(
        archive
          ? "Note archived"
          : navigator.onLine ? "Note created" : "Note saved offline — will sync when online",
        "success"
      );
      setTitle(""); setTags(""); setFolder("General");
      setReminder(""); setRepeat("none"); setColor("#ffffff");
      editor?.commands.clearContent();
      setExpanded(false);
    } catch (err) {
      console.error(err);
      showToastMsg?.("Failed to save", "error");
    }
  };

  const reminderLabel = reminder
    ? new Date(reminder).toLocaleString("en-IN", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div className="an-wrap" style={{ "--note-bg": color }}>
      <div
        className={`an-card ${expanded ? "an-card--expanded" : ""}`}
        style={{ background: color !== "#ffffff" ? color : undefined }}
      >
        {/* Collapsed state */}
        {!expanded && (
          <div className="an-collapsed" onClick={() => setExpanded(true)}>
            <span className="an-collapsed-placeholder">Take a note…</span>
            <div className="an-collapsed-icons">
              <button type="button" className="an-icon-btn"
                onClick={e => { e.stopPropagation(); setExpanded(true); }}>
                <CheckSquare size={20} />
              </button>
              <button type="button" className="an-icon-btn"
                onClick={e => { e.stopPropagation(); setExpanded(true); }}>
                <ImageIcon size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Expanded state */}
        {expanded && (
          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="an-title-row">
              <input
                type="text"
                placeholder="Title"
                className="an-title-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />
              <button type="button" className="an-icon-btn"
                onClick={() => setExpanded(false)} title="Close">
                <X size={16} />
              </button>
            </div>

            {/* Tags */}
            <input
              type="text"
              placeholder="Tags (comma-separated: work, study)"
              className="an-tags-input"
              value={tags}
              onChange={e => setTags(e.target.value)}
            />

            {/* Reminder chip */}
            {reminderLabel && (
              <div className="an-reminder-chip">
                <Bell size={12} /> {reminderLabel}
                {repeat !== "none" && (
                  <span className="an-chip-repeat">↻ {repeat}</span>
                )}
                <button type="button"
                  onClick={() => { setReminder(""); setRepeat("none"); }}>
                  <X size={10} />
                </button>
              </div>
            )}

            {/* Folder row */}
            <div className="an-meta-row">
              <div className="an-folder-select-wrap">
                <select value={folder} onChange={e => setFolder(e.target.value)}
                  className="an-folder-select">
                  {safeFolders.map((name, i) => (
                    <option key={name + i} value={name}>{name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="an-folder-chevron" />
              </div>
            </div>

            {/* Tiptap toolbar */}
            <div className="an-toolbar">
              <button type="button"
                className={`an-tb-btn ${editor?.isActive("bold") ? "active" : ""}`}
                onClick={() => editor?.chain().focus().toggleBold().run()}>
                <Bold size={14} />
              </button>
              <button type="button"
                className={`an-tb-btn ${editor?.isActive("italic") ? "active" : ""}`}
                onClick={() => editor?.chain().focus().toggleItalic().run()}>
                <Italic size={14} />
              </button>
              <button type="button"
                className={`an-tb-btn ${editor?.isActive("heading") ? "active" : ""}`}
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
                <Heading1 size={14} />
              </button>
              <button type="button"
                className={`an-tb-btn ${editor?.isActive("bulletList") ? "active" : ""}`}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                <List size={14} />
              </button>
              <button type="button" className="an-tb-btn"
                onClick={() => editor?.chain().focus().toggleTaskList().run()}>
                <CheckSquare size={14} />
              </button>
              <button type="button" className="an-tb-btn"
                onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
                <Code size={14} />
              </button>
              <div className="an-tb-divider" />
              <button type="button" className="an-tb-btn" title="Undo"
                onClick={() => editor?.chain().focus().undo().run()}>
                <Undo2 size={14} />
              </button>
              <button type="button" className="an-tb-btn" title="Redo"
                onClick={() => editor?.chain().focus().redo().run()}>
                <Redo2 size={14} />
              </button>
            </div>

            {/* Editor */}
            <EditorContent editor={editor} className="an-editor" />

            {/* AI Tools */}
            <AIToolsPanel
              getText={() => editor?.getText() || ""}
              onResult={(text) => editor?.commands.setContent(text)}
              onTitleSuggest={(t) => setTitle(t)}
              showToastMsg={showToastMsg}
            />

            {/* Bottom bar */}
            <div className="an-bottom-bar">
              <div className="an-bottom-left">

                {/* ── REMINDER — now opens NL input ─────────────────────── */}
                <div className="an-popover-wrap">
                  <button
                    type="button"
                    className={`an-icon-btn ${reminder ? "an-icon-btn--active" : ""}`}
                    title="Set reminder (natural language)"
                    onClick={() => { setShowReminder(v => !v); setShowColor(false); }}
                  >
                    <Bell size={18} />
                  </button>
                  {showReminder && (
                    <NaturalLanguageReminderInput
                      reminder={reminder}
                      repeat={repeat}
                      onChangeReminder={setReminder}
                      onChangeRepeat={setRepeat}
                      onClose={() => setShowReminder(false)}
                    />
                  )}
                </div>

                {/* Color picker */}
                <div className="an-popover-wrap">
                  <button
                    type="button"
                    className={`an-icon-btn ${color !== "#ffffff" ? "an-icon-btn--active" : ""}`}
                    title="Background color"
                    onClick={() => { setShowColor(v => !v); setShowReminder(false); }}
                  >
                    <Palette size={18} />
                  </button>
                  {showColor && (
                    <ColorPicker
                      color={color}
                      onChange={setColor}
                      onClose={() => setShowColor(false)}
                    />
                  )}
                </div>

                {/* Image upload */}
                <button type="button" className="an-icon-btn" title="Add image"
                  onClick={() => fileRef.current?.click()}>
                  <ImageIcon size={18} />
                </button>
                <input ref={fileRef} type="file" accept="image/*,video/*" hidden
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) insertImageFile(file);
                  }} />
              </div>

              <div className="an-bottom-right">
                <button type="button" className="an-icon-btn" title="Archive"
                  onClick={() => handleSubmit(null, false, true)}>
                  <Archive size={18} />
                </button>
                <button type="submit" className="an-save-btn">
                  <Save size={15} /> Save Note
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddNote;
