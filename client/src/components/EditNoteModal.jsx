// src/components/EditNoteModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CHANGE: Old ReminderPopover replaced with <NaturalLanguageReminderInput>
// Everything else is identical to the original.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";
import "../index.css";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import AIToolsPanel from "./AIToolsPanel";
import NaturalLanguageReminderInput from "./NaturalLanguageReminderInput"; // ← NEW
import {
  Bell, Palette, Image as ImageIcon, CheckSquare, Code,
  Bold, Italic, Heading1, List, Undo2, Redo2, Archive,
  X, Pin
} from "lucide-react";

const COLORS = [
  { bg: "#ffffff" }, { bg: "#f28b82" }, { bg: "#fbbc04" }, { bg: "#fff475" },
  { bg: "#ccff90" }, { bg: "#a7ffeb" }, { bg: "#cbf0f8" }, { bg: "#aecbfa" },
  { bg: "#d7aefb" }, { bg: "#fdcfe8" }, { bg: "#e6c9a8" }, { bg: "#e8eaed" },
];

const ColorPicker = ({ color, onChange, onClose }) => (
  <div className="an-color-popover">
    <div className="an-cp-grid">
      {COLORS.map(c => (
        <button key={c.bg}
          className={`an-cp-swatch ${color === c.bg ? "an-cp-swatch--active" : ""}`}
          style={{ background: c.bg }}
          onClick={() => { onChange(c.bg); onClose(); }}
        />
      ))}
    </div>
  </div>
);

// ── EditNoteModal ─────────────────────────────────────────────────────────────
const EditNoteModal = ({ note, onClose, onUpdate, showToastMsg }) => {
  const [title, setTitle]           = useState("");
  const [color, setColor]           = useState("#ffffff");
  const [reminder, setReminder]     = useState("");
  const [repeat, setRepeat]         = useState("none");
  const [saveStatus, setSaveStatus] = useState("saved");
  const [showReminder, setShowReminder] = useState(false); // ← now opens NL input
  const [showColor, setShowColor]   = useState(false);
  const [isPinned, setIsPinned]     = useState(false);
  const fileRef = useRef();

  const editor = useEditor({
    extensions: [StarterKit, Image, TaskList, TaskItem.configure({ nested: true })],
    content: note?.body || "",
  });

  useEffect(() => {
    if (note && editor) {
      setTitle(note.title || "");
      setColor(note.color || "#ffffff");
      setReminder(note.reminder ? new Date(note.reminder).toISOString().slice(0, 16) : "");
      setRepeat(note.repeat || "none");
      setIsPinned(note.isPinned || false);
      editor.commands.setContent(note.body || "");
    }
  }, [note, editor]);

  // Auto-save on changes
  useEffect(() => {
    if (!note || !editor) return;
    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      const body = editor.getHTML();
      await onUpdate(note._id, title, body, color, reminder, repeat, isPinned);
      setSaveStatus("saved");
    }, 800);
    return () => clearTimeout(timer);
  }, [title, color, reminder, repeat, isPinned]); // eslint-disable-line

  if (!note) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = editor.getHTML();
    onUpdate(note._id, title, body, color, reminder, repeat, isPinned);
    onClose();
  };

  const insertImage = (file) => {
    const reader = new FileReader();
    reader.onload = (ev) => editor?.chain().focus().setImage({ src: ev.target.result }).run();
    reader.readAsDataURL(file);
  };

  const reminderLabel = reminder
    ? new Date(reminder).toLocaleString("en-IN", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  const hasCustomColor = color && color !== "#ffffff";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container enm-container"
        onClick={e => e.stopPropagation()}
        style={hasCustomColor ? { background: color } : {}}
      >
        {/* Header */}
        <div className="enm-header">
          <div className="enm-save-status">
            {saveStatus === "saving"
              ? <span className="ds-saving">Saving…</span>
              : <span className="ds-saved">Saved ✓</span>}
          </div>
          <button className="enm-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <input
            type="text"
            className="enm-title-input"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
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

          {/* Editor toolbar */}
          <div className="an-toolbar enm-toolbar">
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
            <span className="diary-tb-divider" />
            <button type="button" className="an-tb-btn"
              onClick={() => editor?.chain().focus().undo().run()}>
              <Undo2 size={14} />
            </button>
            <button type="button" className="an-tb-btn"
              onClick={() => editor?.chain().focus().redo().run()}>
              <Redo2 size={14} />
            </button>
          </div>

          {/* Editor */}
          <EditorContent editor={editor} className="tiptap-editor enm-editor" />

          {/* AI Tools */}
          <AIToolsPanel
            getText={() => editor?.getText() || ""}
            onResult={(text) => editor?.commands.setContent(text)}
            onTitleSuggest={(t) => setTitle(t)}
            showToastMsg={showToastMsg}
          />

          {/* Bottom bar */}
          <div className="enm-bottom-bar">
            <div className="enm-bottom-left">

              {/* ── REMINDER — now opens NL input ──────────────────────── */}
              <div className="an-popover-wrap">
                <button type="button"
                  className={`an-icon-btn ${reminder ? "an-icon-btn--active" : ""}`}
                  title="Set reminder (natural language)"
                  onClick={() => { setShowReminder(v => !v); setShowColor(false); }}>
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

              {/* Color */}
              <div className="an-popover-wrap">
                <button type="button"
                  className={`an-icon-btn ${hasCustomColor ? "an-icon-btn--active" : ""}`}
                  onClick={() => { setShowColor(v => !v); setShowReminder(false); }}>
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

              {/* Image */}
              <button type="button" className="an-icon-btn"
                onClick={() => fileRef.current?.click()}>
                <ImageIcon size={18} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) insertImage(f); }} />

              {/* Pin */}
              <button type="button"
                className={`an-icon-btn ${isPinned ? "an-icon-btn--active" : ""}`}
                onClick={() => setIsPinned(v => !v)}>
                <Pin size={18} fill={isPinned ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="enm-bottom-right">
              <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
              <button type="submit" className="btn-submit">Update</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditNoteModal;
