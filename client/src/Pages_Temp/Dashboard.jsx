// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import api from "../utils/axiosInstance";
import NoteCard from "../components/NoteCard";
import AddNote from "../components/AddNote";
import Header from "../components/Header";
import "../index.css";
import EditNoteModal from "../components/EditNoteModal";
import DiaryPage from "../components/DiaryPage";
import HabitTracker from "../components/HabitTracker";
import PremiumPage from "./PremiumPage";          // ← premium page
import { usePremium } from "../context/PremiumContext"; // ← premium context
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X } from "lucide-react";
import { useRef } from "react";
// 
// ── Max browser/speech notifications per reminder ─────────────────────────────
const MAX_NOTIFY = 5;

// ── Premium-gated sections ────────────────────────────────────────────────────
const PREMIUM_SECTIONS = ["diary", "habits", "locked"];

// ── Premium Gate Modal ────────────────────────────────────────────────────────
// Shown whenever a non-premium user tries to access a gated feature.
const PremiumGateModal = ({ featureName, onClose }) => (
  <div
    style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}
    onClick={onClose}
  >
    <div
      style={{
        background: "#fff", borderRadius: 24, padding: "0 0 24px",
        maxWidth: 680, width: "100%", maxHeight: "90vh",
        overflowY: "auto", position: "relative",
        boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16, zIndex: 10,
          background: "#f1f5f9", border: "none", borderRadius: "50%",
          width: 32, height: 32, cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <X size={16} />
      </button>

      {/* Small hint above the PremiumPage */}
      {featureName && (
        <div style={{
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          color: "#fff", textAlign: "center", padding: "14px 20px",
          borderRadius: "24px 24px 0 0", fontSize: 14, fontWeight: 600,
        }}>
          🔒 {featureName} is a Premium feature — unlock it below!
        </div>
      )}

      {/* Full PremiumPage embedded */}
      <PremiumPage onClose={onClose} />
    </div>
  </div>
);

// ── SortableNoteCard ──────────────────────────────────────────────────────────
const SortableNoteCard = ({ note, ...props }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note._id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      {...attributes}
      {...listeners}
    >
      <NoteCard note={note} {...props} />
    </div>
  );
};

const Dashboard = () => {
  const [notes, setNotes]               = useState([]);
  const [archivedNotes, setArchivedNotes] = useState([]);
  const [userName, setUserName]         = useState("");
  const [loading, setLoading]           = useState(true);
  const [editingNote, setEditingNote]   = useState(null);
  const [selectedTags, setSelectedTags]     = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("All");
  const [activeSection, setActiveSection]   = useState("notes");
  const [folders, setFolders]           = useState([]);
  const [searchTerm, setSearchTerm]     = useState("");
  const [lastDeleted, setLastDeleted]   = useState(null);
  const [toast,  setToast]  = useState({ show: false, message: "", type: "info", undo: false });
  const [modal,  setModal]  = useState({ show: false, message: "", onConfirm: null });
  const [shake,  setShake]  = useState(false);
  const [pinModal,  setPinModal]  = useState({ show: false, noteId: null, isUnlock: false });
  const [pinInput,  setPinInput]  = useState("");
  const [addNoteOpen, setAddNoteOpen] = useState(false);

  // ── Premium gate state ────────────────────────────────────────────────────
  const [premiumGate, setPremiumGate] = useState({ show: false, featureName: "" });
  const { isPremium, loading: premiumLoading } = usePremium();

  const notifyCountRef = useRef({});
  const pinRef  = useRef(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const showToastMsg = (msg, type = "info") => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ show: false, message: "", type: "info" }), 2500);
  };

  // ── Open premium gate modal ───────────────────────────────────────────────
  const openPremiumGate = (featureName) => {
    setPremiumGate({ show: true, featureName });
  };
  const closePremiumGate = () => {
    setPremiumGate({ show: false, featureName: "" });
  };

  // ── Intercepted setActiveSection — checks premium for gated sections ──────
// In Dashboard.jsx — replace handleSetActiveSection
const handleSetActiveSection = (section) => {
  // While premium status is still loading, don't make any gate decision yet
  if (PREMIUM_SECTIONS.includes(section) && premiumLoading) {
    // Optimistically allow — if they're not premium, the page itself will show nothing sensitive
    setActiveSection(section);
    return;
  }

  if (PREMIUM_SECTIONS.includes(section) && !isPremium) {
    const LABELS_GATE = {
      diary:  "Personal Diary",
      habits: "Habit Tracker",
      locked: "Locked Notes",
    };
    openPremiumGate(LABELS_GATE[section] || section);
    return;
  }

  setActiveSection(section);
};

  // ── Fetch active notes ───────────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    try {
      const res = await api.get("/api/dashboard");
      setNotes(res.data?.notes || []);
      setUserName(res.data.userName);
      const fl = [...new Set((res.data?.notes || [])
        .map(n => typeof n.folder === "string" ? n.folder : "General"))]
        .map(name => ({ name: String(name), parent: null }));
      setFolders(prev => prev.length > 0 ? prev : fl);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchArchivedNotes = useCallback(async () => {
    try {
      const res = await api.get("/api/dashboard/archived");
      setArchivedNotes(res.data || []);
    } catch {}
  }, []);

  const fetchTrashNotes = async () => {
    try { const r = await api.get("/api/dashboard/trash"); setNotes(r.data); } catch {}
  };

  useEffect(() => { fetchNotes(); fetchArchivedNotes(); }, [fetchNotes, fetchArchivedNotes]);
  useEffect(() => { if (Notification.permission !== "granted") Notification.requestPermission(); }, []);

  // ── Smart reminder loop ──────────────────────────────────────────────────
  const playSound     = () => { try { new Audio("/alert.mp3").play(); } catch {} };
  const speakReminder = (t) => { const s = new SpeechSynthesisUtterance(t); s.lang = "en-IN"; window.speechSynthesis.speak(s); };

  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      notes.forEach(note => {
        if (!note.reminder || note.reminded) return;
        const reminderTime = new Date(note.reminder);
        if (now < reminderTime) return;
        const count = notifyCountRef.current[note._id] || 0;
        if (count >= MAX_NOTIFY) return;
        notifyCountRef.current[note._id] = count + 1;
        showToastMsg(`⏰ Reminder: ${note.title}`, "info");
        playSound();
        speakReminder(`Reminder for ${note.title}`);
        if (Notification.permission === "granted") {
          new Notification("🔔 WriteUp Reminder", { body: note.title, icon: "/logo.png" });
        }
        if (count + 1 >= MAX_NOTIFY) {
          api.put(`/api/dashboard/item/${note._id}`, { reminded: true }).catch(() => {});
          setNotes(prev => prev.map(n => n._id === note._id ? { ...n, reminded: true } : n));
        }
        if (note.repeat === "daily" || note.repeat === "weekly") {
          const next = new Date(reminderTime);
          if (note.repeat === "daily")  next.setDate(next.getDate() + 1);
          if (note.repeat === "weekly") next.setDate(next.getDate() + 7);
          delete notifyCountRef.current[note._id];
          api.put(`/api/dashboard/item/${note._id}`, { reminder: next, reminded: false }).catch(() => {});
          setNotes(prev => prev.map(n => n._id === note._id ? { ...n, reminder: next, reminded: false } : n));
        }
      });
    }, 5000);
    return () => clearInterval(iv);
  }, [notes]);

  // ── Note handlers ────────────────────────────────────────────────────────────
  const updateReminder = async (id, newTime) => {
    try { await api.put(`/api/dashboard/item/${id}`, { reminder: newTime, reminded: false }); } catch {}
  };
  const snooze = (id, m = 5) => {
    const t = new Date(); t.setMinutes(t.getMinutes() + m);
    updateReminder(id, t); showToastMsg("⏳ Snoozed 5 min", "info");
  };

  const handleNoteAdded  = (n) => { setNotes(prev => [n, ...prev]); setAddNoteOpen(false); };

  // ── handleEdit: intercept lock action — check premium first ──────────────
  const handleEdit = (note) => {
    if (note.isLockAction) {
      // Lock/Unlock is a premium feature
      if (!isPremium && !premiumLoading) {
        openPremiumGate("Locked Notes");
        return;
      }
      setPinModal({ show: true, noteId: note._id, isUnlock: note.isUnlock });
      setPinInput("");
    } else {
      setEditingNote(note);
    }
  };

  const handleMarkDone = async (id) => {
    try {
      await api.put(`/api/dashboard/item/${id}`, { reminder: null, reminded: false });
      setNotes(prev => prev.map(n => n._id === id ? { ...n, reminder: null, reminded: false } : n));
      delete notifyCountRef.current[id];
      showToastMsg("✅ Reminder cleared", "success");
    } catch {}
  };

  const handleTogglePin = async (id) => {
    const n = notes.find(n => n._id === id) || archivedNotes.find(n => n._id === id);
    try { await api.put(`/api/dashboard/item/${id}`, { isPinned: !n?.isPinned }); fetchNotes(); fetchArchivedNotes(); } catch {}
  };

  const handleDelete = async (id) => {
    const note = notes.find(n => n._id === id) || archivedNotes.find(n => n._id === id);
    setLastDeleted(note);
    await api.delete(`/api/dashboard/item-delete/${id}`);
    setNotes(prev => prev.map(n => n._id === id ? { ...n, isDeleted: true } : n));
    setArchivedNotes(prev => prev.filter(n => n._id !== id));
    setToast({ show: true, message: "🗑 Note moved to trash", type: "error", undo: true });
    setTimeout(() => { setToast({ show: false, message: "", type: "info", undo: false }); setLastDeleted(null); }, 3000);
  };

  const handleUndo = async () => {
    if (!lastDeleted) return;
    try {
      await api.put(`/api/dashboard/item-restore/${lastDeleted._id}`, {});
      setNotes(prev => prev.map(n => n._id === lastDeleted._id ? { ...n, isDeleted: false } : n));
      setToast({ show: false, message: "", type: "info", undo: false });
      setLastDeleted(null);
      showToastMsg("♻️ Restored", "success");
    } catch {}
  };

  const handleUpdateNote = async (id, title, body, color, reminder, repeat, isPinned) => {
    try {
      const r = await api.put(`/api/dashboard/item/${id}`, { title, body, color, reminder, repeat, isPinned });
      setNotes(prev => prev.map(n => n._id === id ? r.data : n));
      setArchivedNotes(prev => prev.map(n => n._id === id ? r.data : n));
    } catch {}
  };

  const handleSearch = (results, term) => {
    if (!term) { fetchNotes(); setSearchTerm(""); }
    else { setNotes(results); setSearchTerm(term); }
  };

  const handleRestore = async (id) => {
    try {
      await api.put(`/api/dashboard/item-restore/${id}`, {});
      showToastMsg("♻️ Restored", "success");
      setNotes(prev => prev.filter(n => n._id !== id));
    } catch {}
  };

  const handlePermanentDelete = (id) => setModal({
    show: true,
    message: "Delete permanently? This cannot be undone.",
    onConfirm: async () => {
      try {
        await api.delete(`/api/dashboard/item-permanent/${id}`);
        setNotes(prev => prev.filter(n => n._id !== id));
        showToastMsg("Deleted permanently", "error");
      } catch {}
    },
  });

  const handleArchive = async (id) => {
    try {
      await api.put(`/api/dashboard/archive/${id}`);
      setNotes(prev => prev.filter(n => n._id !== id));
      await fetchArchivedNotes();
      showToastMsg("📦 Note archived", "success");
    } catch { showToastMsg("Archive failed", "error"); }
  };

  const handleUnarchive = async (id) => {
    try {
      await api.put(`/api/dashboard/unarchive/${id}`);
      setArchivedNotes(prev => prev.filter(n => n._id !== id));
      await fetchNotes();
      showToastMsg("📋 Moved back to Notes", "success");
    } catch { showToastMsg("Unarchive failed", "error"); }
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setNotes(prev => {
      const oi = prev.findIndex(n => n._id === active.id);
      const ni = prev.findIndex(n => n._id === over.id);
      return arrayMove(prev, oi, ni);
    });
  };

  const handleAddFolder    = (name) => { if (!folders.some(f => f.name === name)) { setFolders(prev => [...prev, { name, parent: null }]); showToastMsg("📂 Folder created", "success"); } };
  const handleDeleteFolder = (name) => { setFolders(prev => prev.filter(f => f.name !== name)); setNotes(prev => prev.map(n => n.folder === name ? { ...n, folder: "General" } : n)); };
  const handleRenameFolder = (oldName, newName) => { if (!newName) return; setFolders(prev => prev.map(f => f.name === oldName ? { ...f, name: newName } : f)); setNotes(prev => prev.map(n => n.folder === oldName ? { ...n, folder: newName } : n)); };

  // ── Filtering ────────────────────────────────────────────────────────────────
  const getFilteredNotes = () => {
    if (activeSection === "archived") {
      return archivedNotes.filter(n => !n.isDeleted);
    }
    let base = notes.filter(n => !n.isDeleted && !n.isLocked && !n.isArchived);
    if (activeSection === "reminders") base = base.filter(n => n.reminder);
    else if (activeSection === "routine") base = base.filter(n => n.category === "routine" || n.folder === "Daily Routine");
    else if (activeSection === "trash")   base = notes.filter(n => n.isDeleted);
    else if (activeSection === "locked")  base = notes.filter(n => n.isLocked);
    else if (selectedFolder !== "All")    base = base.filter(n => n.folder === selectedFolder);
    if (selectedTags.length > 0) base = base.filter(n => selectedTags.some(t => n.tags?.includes(t)));
    return base;
  };

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /><p>Loading your workspace…</p></div>;

  const filteredNotes = getFilteredNotes();
  const pinnedNotes   = filteredNotes.filter(n => n.isPinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);
  const allTags = [...new Set(notes.flatMap(n => n.tags || []).filter(Boolean))];

  const LABELS = {
    notes:     "Notes",
    reminders: "Reminders",
    diary:     "Personal Diary",
    routine:   "Daily Routine",
    habits:    "Habit Tracker",
    archived:  "Archived Notes",
    trash:     "Trash",
    locked:    "Locked Notes",
  };

  const isSpecial     = ["diary", "habits"].includes(activeSection);
  const isArchiveView = activeSection === "archived";

  return (
    <>
      <Header
        onSearch={handleSearch}
        userName={userName}
        activeSection={activeSection}
        setActiveSection={handleSetActiveSection}   // ← intercepted version
        folders={folders}
        onAddFolder={handleAddFolder}
        onDeleteFolder={handleDeleteFolder}
        onRenameFolder={handleRenameFolder}
        onFolderSelect={setSelectedFolder}
        selectedFolder={selectedFolder}
        onFetchTrash={fetchTrashNotes}
        archivedCount={archivedNotes.length}
        isPremium={isPremium}                        // ← pass to Header for badges
      />

      <main className={`main-fullwidth ${activeSection === "diary" ? "diary-bg" : ""}`}>
        {activeSection === "diary"   && <DiaryPage     showToastMsg={showToastMsg} userId={userName} />}
        {activeSection === "habits"  && <HabitTracker  showToastMsg={showToastMsg} />}

        {!isSpecial && (
          <>
            {activeSection === "notes" && (
              <div className="add-note-area">
                {!addNoteOpen ? (
                  <button className="add-note-trigger" onClick={() => setAddNoteOpen(true)}>
                    <Plus size={16} /> Take a note…
                  </button>
                ) : (
                  <AddNote onNoteAdded={handleNoteAdded} folders={folders} showToastMsg={showToastMsg} />
                )}
              </div>
            )}

            <div className="section-header-row">
              <h2 className="section-title">{LABELS[activeSection] || "Notes"}</h2>
              {isArchiveView && (
                <span className="section-subtitle">{archivedNotes.length} archived note{archivedNotes.length !== 1 ? "s" : ""}</span>
              )}
              {allTags.length > 0 && !isArchiveView && (
                <div className="tag-filter-bar">
                  <button className={`tag-pill ${selectedTags.length === 0 ? "active" : ""}`} onClick={() => setSelectedTags([])}>All</button>
                  {allTags.map(tag => (
                    <button key={tag} className={`tag-pill ${selectedTags.includes(tag) ? "active" : ""}`}
                      onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}>
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              {pinnedNotes.length > 0 && (
                <>
                  <p className="notes-group-label">📌 Pinned</p>
                  <SortableContext items={pinnedNotes.map(n => n._id)} strategy={rectSortingStrategy}>
                    <div className="notes-grid-new">
                      {pinnedNotes.map(note => (
                        <SortableNoteCard
                          key={note._id}
                          note={note}
                          onDelete={handleDelete}
                          searchTerm={searchTerm}
                          onTogglePin={handleTogglePin}
                          onEdit={handleEdit}
                          onRestore={handleRestore}
                          onPermanentDelete={handlePermanentDelete}
                          onMarkDone={handleMarkDone}
                          onArchive={!isArchiveView ? handleArchive : undefined}
                          onUnarchive={isArchiveView ? handleUnarchive : undefined}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  {unpinnedNotes.length > 0 && <p className="notes-group-label">Other notes</p>}
                </>
              )}
              <SortableContext items={unpinnedNotes.map(n => n._id)} strategy={rectSortingStrategy}>
                <div className="notes-grid-new">
                  {unpinnedNotes.map(note => (
                    <SortableNoteCard
                      key={note._id}
                      note={note}
                      onDelete={handleDelete}
                      searchTerm={searchTerm}
                      onTogglePin={handleTogglePin}
                      onEdit={handleEdit}
                      onRestore={handleRestore}
                      onPermanentDelete={handlePermanentDelete}
                      onMarkDone={handleMarkDone}
                      onArchive={!isArchiveView ? handleArchive : undefined}
                      onUnarchive={isArchiveView ? handleUnarchive : undefined}
                    />
                  ))}
                </div>
              </SortableContext>

              {filteredNotes.length === 0 && (
                <div className="empty-state">
                  <p>{isArchiveView ? "No archived notes." : "No notes here yet."}</p>
                </div>
              )}
            </DndContext>
          </>
        )}
      </main>

      {/* ── Premium Gate Modal ─────────────────────────────────────────────── */}
      {premiumGate.show && (
        <PremiumGateModal
          featureName={premiumGate.featureName}
          onClose={closePremiumGate}
        />
      )}

      {/* ── Toasts / Modals ────────────────────────────────────────────────── */}
      <div className="toast-container">
        {toast.show && (
          <div className={`toast-card toast-${toast.type}`}>
            <div className="toast-left">{toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "ℹ️"}</div>
            <div className="toast-message">
              {toast.message}
              {toast.undo && <button className="toast-undo" onClick={handleUndo}>UNDO</button>}
            </div>
            {toast.type === "info" && lastDeleted && (
              <button onClick={() => snooze(lastDeleted._id)}>Snooze 5m</button>
            )}
            <div className="toast-close" onClick={() => setToast({ show: false, message: "", type: "info" })}>✖</div>
            <div className="toast-bar" />
          </div>
        )}

        {modal.show && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>Confirm</h3>
              <p>{modal.message}</p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setModal({ show: false })}>Cancel</button>
                <button className="btn-confirm" onClick={() => { modal.onConfirm(); setModal({ show: false }); }}>OK</button>
              </div>
            </div>
          </div>
        )}

        {pinModal.show && (
          <div className="glass-overlay">
            <div className={`glass-modal ${shake ? "shake" : ""}`}>
              <h2 className="glass-title">🔐 Secure Note</h2>
              <p className="glass-subtitle">Enter your PIN to continue</p>
              <div className="pin-container" onClick={() => pinRef.current?.focus()}>
                <input
                  ref={pinRef}
                  type="password"
                  maxLength="4"
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  className="pin-hidden-input"
                  autoFocus
                  autoComplete="off"
                />
                <div className="pin-dots">
                  {[0, 1, 2, 3].map(i => <div key={i} className="dot">{pinInput[i] ? "•" : ""}</div>)}
                </div>
              </div>
              <div className="glass-actions">
                <button className="glass-btn cancel" onClick={() => setPinModal({ show: false })}>Cancel</button>
                <button className="glass-btn confirm" onClick={async () => {
                  try {
                    await api.put(`/api/dashboard/lock/${pinModal.noteId}`, { pin: pinInput, unlock: pinModal.isUnlock });
                    fetchNotes();
                    setPinModal({ show: false, noteId: null, isUnlock: false });
                    setPinInput("");
                    showToastMsg(pinModal.isUnlock ? "🔓 Unlocked" : "🔒 Locked", "success");
                  } catch {
                    setShake(true);
                    setPinInput("");
                    showToastMsg("❌ Wrong PIN", "error");
                    setTimeout(() => setShake(false), 400);
                  }
                }}>
                  {pinModal.isUnlock ? "Unlock" : "Lock"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <EditNoteModal
        note={editingNote}
        onClose={() => setEditingNote(null)}
        onUpdate={handleUpdateNote}
        showToastMsg={showToastMsg}
      />
    </>
  );
};

export default Dashboard;


