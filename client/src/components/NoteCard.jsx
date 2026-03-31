// src/components/NoteCard.jsx
import React, { useEffect, useState } from "react";
import {
  Pin, Trash2, Pencil, Bell, Lock, Unlock,
  FileText, FileDown, FileCode2, RotateCcw, X,
  Share2, Archive, ArchiveRestore,
} from "lucide-react";
import "../index.css";
import jsPDF from "jspdf";

// ── Helpers ───────────────────────────────────────────────────────────────────
const getTextColor = (bgColor) => {
  if (!bgColor || bgColor === "#ffffff") return null;
  const c = bgColor.substring(1);
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#1a1a2e" : "#ffffff";
};

const highlightText = (text, searchTerm) => {
  if (!searchTerm || !text) return text;
  const words = searchTerm.split(" ").filter(Boolean);
  let result = text;
  words.forEach((word) => {
    result = result.replace(new RegExp(`(${word})`, "gi"), "<mark>$1</mark>");
  });
  return result;
};

// ── NoteCard ──────────────────────────────────────────────────────────────────
const NoteCard = ({
  note,
  onDelete,
  searchTerm,
  onTogglePin,
  onEdit,
  onRestore,
  onPermanentDelete,
  onMarkDone,
  onArchive,    // FEATURE 1: archive handler
  onUnarchive,  // FEATURE 1: unarchive handler
}) => {
  const [showExport, setShowExport] = useState(false);
  const [showShare,  setShowShare]  = useState(false);
  const [timeLeft,   setTimeLeft]   = useState("");
  const [progress,   setProgress]   = useState(100);
  const [copied,     setCopied]     = useState(false);

  const handleLock = () => onEdit({ ...note, isLockAction: true, isUnlock: note.isLocked });

  const cleanText = (html) => {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.innerText;
  };

  // ── Export ──────────────────────────────────────────────────────────────────
  const exportAsPDF = () => {
    const doc  = new jsPDF();
    const body = cleanText(note.body || "");
    doc.setFontSize(16); doc.text(note.title || "Note", 10, 10);
    doc.setFontSize(12); doc.text(doc.splitTextToSize(body, 180), 10, 20);
    doc.save(`${note.title || "note"}.pdf`);
  };
  const exportAsMarkdown = () => {
    const blob = new Blob([`# ${note.title || "note"}\n\n${cleanText(note.body || "")}`], { type: "text/markdown" });
    Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${note.title || "note"}.md` }).click();
  };
  const exportAsText = () => {
    const blob = new Blob([`${note.title}\n\n${cleanText(note.body || "")}`], { type: "text/plain" });
    Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${note.title || "note"}.txt` }).click();
  };

  // ── Share ───────────────────────────────────────────────────────────────────
  const shareText = `📝 ${note.title || "Note"}\n\n${cleanText(note.body || "").slice(0, 300)}`;
  const shareLink = `${window.location.origin}/note/${note._id}`;
  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + "\n\n" + shareLink)}`, "_blank");
  const shareGmail    = () => window.open(`https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(note.title || "Note")}&body=${encodeURIComponent(shareText + "\n\n" + shareLink)}`, "_blank");
  const copyLink = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: note.title, text: shareText, url: shareLink }); }
      else { await navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch {}
  };

  // ── Reminder countdown ──────────────────────────────────────────────────────
  const isOverdue = note.reminder && new Date(note.reminder) < new Date();
  const isUrgent  = note.reminder && new Date(note.reminder) - new Date() < 5 * 60 * 1000;

  useEffect(() => {
    if (!note.reminder) return;
    const start = new Date(note.createdAt || Date.now()).getTime();
    const end   = new Date(note.reminder).getTime();
    const iv = setInterval(() => {
      const now = Date.now(), diff = end - now;
      if (diff <= 0) { setTimeLeft("Overdue"); setProgress(0); return; }
      const hrs  = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(hrs > 0 ? `${hrs}h ${mins}m` : mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
      setProgress(((end - now) / (end - start)) * 100);
    }, 1000);
    return () => clearInterval(iv);
  }, [note.reminder]);

  const getCountdownColor = () => {
    if (!note.reminder) return "#3b82f6";
    const diff = new Date(note.reminder) - new Date();
    if (diff < 0 || diff < 5 * 60 * 1000) return "#ef4444";
    if (diff < 30 * 60 * 1000) return "#f59e0b";
    return "#3b82f6";
  };

  const hasCustomColor = note.color && note.color !== "#ffffff";

  return (
    <div
      id={note._id}
      className={`nc-card ${note.isPinned ? "nc-pinned" : ""} ${isUrgent ? "nc-urgent" : ""} ${isOverdue ? "nc-overdue" : ""} ${note.isArchived ? "nc-archived" : ""}`}
      style={hasCustomColor ? { backgroundColor: note.color, color: getTextColor(note.color) } : {}}
    >
      {note.isPinned && <div className="nc-pin-strip" />}

      {/* ── Action bar ──────────────────────────────────────────────────────── */}
      <div className="nc-actions">

        {/* Pin */}
        <button className={`nc-btn ${note.isPinned ? "nc-btn--active" : ""}`} onClick={() => onTogglePin(note._id)} title={note.isPinned ? "Unpin" : "Pin"}>
          <Pin size={14} fill={note.isPinned ? "currentColor" : "none"} />
        </button>

        {/* Edit */}
        {!note.isDeleted && (
          <button className="nc-btn" onClick={() => onEdit(note)} title="Edit">
            <Pencil size={14} />
          </button>
        )}

        {/* Delete (soft) */}
        {!note.isDeleted && (
          <button className="nc-btn nc-btn--danger" onClick={() => onDelete(note._id)} title="Delete">
            <Trash2 size={14} />
          </button>
        )}

        {/* Lock / Unlock */}
        <button className="nc-btn" onClick={handleLock} title={note.isLocked ? "Unlock" : "Lock"}>
          {note.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
        </button>

        {/* FEATURE 1: Archive / Unarchive
            - Show Archive button for active notes (not deleted, not already archived)
            - Show Unarchive button when viewing the Archive section               */}
        {!note.isDeleted && !note.isArchived && onArchive && (
          <button className="nc-btn" onClick={() => onArchive(note._id)} title="Archive">
            <Archive size={14} />
          </button>
        )}
        {note.isArchived && onUnarchive && (
          <button className="nc-btn nc-btn--restore" onClick={() => onUnarchive(note._id)} title="Unarchive">
            <ArchiveRestore size={14} />
          </button>
        )}

        {/* Share */}
        <div className="nc-export-wrap">
          <button className="nc-btn" onClick={() => { setShowShare(v => !v); setShowExport(false); }} title="Share">
            <Share2 size={14} />
          </button>
          {showShare && (
            <>
              <div className="nc-export-backdrop" onClick={() => setShowShare(false)} />
              <div className="nc-export-menu">
                <button onClick={() => { shareWhatsApp(); setShowShare(false); }}>🟢 WhatsApp</button>
                <button onClick={() => { shareGmail();    setShowShare(false); }}>📧 Gmail</button>
                <button onClick={() => { copyLink();      setShowShare(false); }}>{copied ? "✅ Copied!" : "🔗 Copy link"}</button>
              </div>
            </>
          )}
        </div>

        {/* Export */}
        <div className="nc-export-wrap">
          <button className="nc-btn" onClick={() => { setShowExport(v => !v); setShowShare(false); }} title="Export">
            <FileDown size={14} />
          </button>
          {showExport && (
            <>
              <div className="nc-export-backdrop" onClick={() => setShowExport(false)} />
              <div className="nc-export-menu">
                <button onClick={() => { exportAsPDF();      setShowExport(false); }}><FileText  size={13} /> PDF</button>
                <button onClick={() => { exportAsMarkdown(); setShowExport(false); }}><FileCode2 size={13} /> Markdown</button>
                <button onClick={() => { exportAsText();     setShowExport(false); }}><FileText  size={13} /> Plain text</button>
              </div>
            </>
          )}
        </div>

        {/* Trash: restore / permanent delete */}
        {note.isDeleted && (
          <>
            <button className="nc-btn nc-btn--restore" onClick={() => onRestore(note._id)} title="Restore"><RotateCcw size={14} /></button>
            <button className="nc-btn nc-btn--danger"  onClick={() => onPermanentDelete(note._id)} title="Delete forever"><X size={14} /></button>
          </>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="nc-body">
        <div className="nc-title-row">
          <h3 className="nc-title" dangerouslySetInnerHTML={{ __html: highlightText(note.title, searchTerm) }} />
          <div className="nc-badges">
            {note.reminder   && <Bell size={13} className="nc-badge-icon" />}
            {note.isPinned   && <Pin  size={13} className="nc-badge-icon nc-badge-pin" fill="currentColor" />}
            {note.isArchived && <Archive size={13} className="nc-badge-icon" style={{ opacity: 0.5 }} />}
          </div>
        </div>

        {note.isLocked ? (
          <div className="nc-locked"><Lock size={20} /><span>Locked note</span></div>
        ) : (
          <div className="nc-content" dangerouslySetInnerHTML={{ __html: highlightText(note.body, searchTerm) }} />
        )}

        {note.tags?.length > 0 && (
          <div className="nc-tags">
            {note.tags.map((tag, i) => (
              <span key={i} className="nc-tag" dangerouslySetInnerHTML={{ __html: highlightText(`#${tag}`, searchTerm) }} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="nc-footer">
        <span className="nc-date">
          {new Date(note.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
        </span>

        {/* Reminder countdown — only shown when a reminder exists */}
        {note.reminder && (
          <div className="nc-countdown" style={{ color: getCountdownColor() }}>
            <span>⏳ {timeLeft}</span>
            <div className="nc-progress">
              <div className="nc-progress-fill" style={{ width: `${Math.max(0, progress)}%`, backgroundColor: getCountdownColor() }} />
            </div>
          </div>
        )}

        {/* FEATURE 3: "Done" button ONLY for notes that have a reminder set.
            Notes without reminders never show this button.                   */}
        {!note.isDeleted && note.reminder && (
          <button className="nc-done-btn" onClick={() => onMarkDone(note._id)} title="Mark as done — clears reminder">
            ✓ Done
          </button>
        )}
      </div>
    </div>
  );
};

export default NoteCard;
