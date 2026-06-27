// src/components/FeatureDemoSection.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Feature demo section for the landing page.
// Each tab shows an animated UI mockup that simulates a screen recording.
// When real MP4 files are ready, drop them in /public/videos/ and set
// the `video` field on each TABS entry — the <video> element is already wired.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from "react";

const DEMO_DURATION = 6800; // ms each tab is shown before auto-advancing

// ── Tab metadata ──────────────────────────────────────────────────────────────
const TABS = [
  {
    id: "notes",
    emoji: "✏️",
    color: "#6366f1",
    bg: "#eef2ff",
    title: "Smart Notes",
    tagline: "Capture ideas at the speed of thought",
    desc: "Rich text editor with images, code blocks, AI tools, and instant tag search — all in one place.",
    video: null, // set to "/videos/smart-notes.mp4" when ready
  },
  {
    id: "diary",
    emoji: "📔",
    color: "#ec4899",
    bg: "#fdf2f8",
    title: "Personal Diary",
    tagline: "Your thoughts, encrypted and private",
    desc: "PIN-protected diary with mood tracking, colour themes, and full-text search over every entry.",
    video: null,
  },
  {
    id: "habits",
    emoji: "📊",
    color: "#10b981",
    bg: "#ecfdf5",
    title: "Habit Tracker",
    tagline: "Small actions. Lasting change.",
    desc: "Build daily streaks, visualise progress with charts, and get congratulated by email when you hit milestones.",
    video: null,
  },
  {
    id: "reminders",
    emoji: "🔔",
    color: "#f59e0b",
    bg: "#fffbeb",
    title: "Smart Reminders",
    tagline: "Never miss what matters",
    desc: "Set date/time reminders with daily or weekly repeats directly on any note — right inside your workspace.",
    video: null,
  },
  {
    id: "locked",
    emoji: "🔒",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    title: "Locked Notes",
    tagline: "Sensitive content stays hidden",
    desc: "PIN-protect any note. Content stays blurred until you unlock it — invisible to prying eyes.",
    video: null,
  },
  {
    id: "ai",
    emoji: "✨",
    color: "#06b6d4",
    bg: "#ecfeff",
    title: "AI Writing Tools",
    tagline: "Write better with one click",
    desc: "Improve, summarise, expand, translate, or analyse the mood of any note in seconds.",
    video: null,
  },
  {
    id: "collab",
    emoji: "🤝",
    color: "#f97316",
    bg: "#fff7ed",
    title: "Live Collaboration",
    tagline: "Write together, in real time",
    desc: "Share any note via a link — teammates edit simultaneously with live cursors, just like Google Docs.",
    video: null,
  },
];

// ── Individual animated demo panels ───────────────────────────────────────────

const NotesDemo = ({ step, dark: d }) => (
  <div className="fdemo-panel">
    {/* Toolbar */}
    <div className="fdemo-toolbar">
      {["B", "I", "≡", "⟨/⟩", "🖼"].map((t) => (
        <span key={t} className="fdemo-tool-btn" style={{ background: d ? "#1e293b" : "#f1f5f9", borderColor: d ? "#334155" : "#e2e8f0", color: d ? "#94a3b8" : "#64748b" }}>{t}</span>
      ))}
    </div>

    {/* Title */}
    <div className="fdemo-note-title" style={{ color: d ? "#f1f5f9" : "#0f172a", opacity: step >= 0 ? 1 : 0, transform: step >= 0 ? "none" : "translateY(8px)", transition: "all 0.4s ease" }}>
      Meeting Notes — Q3 Planning
    </div>

    {/* Lines */}
    {[
      { text: "Review roadmap items and sprint velocity", delay: 1 },
      { text: "Discuss team capacity and blockers", delay: 2 },
      { text: "Set OKRs and key deliverables for Q3", delay: 3 },
    ].map((l, i) => (
      <div key={i} className="fdemo-note-line" style={{ opacity: step >= l.delay ? 1 : 0, transform: step >= l.delay ? "none" : "translateY(8px)", transition: "all 0.38s ease", color: d ? "#cbd5e1" : "#374151" }}>
        <span style={{ color: "#6366f1" }}>◆</span> {l.text}
        {i === 0 && step >= l.delay && <span className="fdemo-cursor" />}
      </div>
    ))}

    {/* Tags */}
    <div className="fdemo-tags-row" style={{ opacity: step >= 4 ? 1 : 0, transition: "opacity 0.4s ease 0.1s" }}>
      {["#work", "#planning", "#q3"].map((tag) => (
        <span key={tag} className="fdemo-tag" style={{ background: d ? "#1e1b4b" : "#eef2ff", color: "#6366f1" }}>{tag}</span>
      ))}
    </div>

    {/* AI suggestion */}
    <div className="fdemo-ai-bubble" style={{ opacity: step >= 5 ? 1 : 0, transform: step >= 5 ? "none" : "translateY(10px)", transition: "all 0.4s ease", background: d ? "#0c1639" : "#f5f3ff", borderColor: d ? "#312e81" : "#e0d9ff" }}>
      <span>✨</span>
      <span style={{ color: d ? "#a5b4fc" : "#4338ca", fontSize: 12.5 }}>AI: "Add action items and assign owners?"</span>
    </div>
  </div>
);

const DiaryDemo = ({ step, dark: d }) => {
  const moods = ["😔", "😐", "🙂", "😊", "🤩"];
  return (
    <div className="fdemo-panel">
      {/* Calendar strip */}
      <div className="fdemo-calendar-strip">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
          <div key={day} className={`fdemo-cal-day ${i === 3 ? "fdemo-cal-today" : ""}`} style={{ background: i === 3 ? "#ec4899" : d ? "#1e293b" : "#f8fafc", color: i === 3 ? "#fff" : d ? "#94a3b8" : "#64748b", borderColor: d ? "#334155" : "#e2e8f0" }}>
            <div className="fdemo-cal-label">{day}</div>
            <div className="fdemo-cal-date">{15 + i}</div>
          </div>
        ))}
      </div>

      {/* Mood selector */}
      <div className="fdemo-mood-row" style={{ opacity: step >= 1 ? 1 : 0, transition: "opacity 0.4s ease" }}>
        <span className="fdemo-mood-label" style={{ color: d ? "#94a3b8" : "#64748b" }}>How are you feeling?</span>
        <div className="fdemo-moods">
          {moods.map((m, i) => (
            <span key={m} className="fdemo-mood-btn" style={{ transform: step >= 2 && i === 3 ? "scale(1.35)" : "scale(1)", transition: `transform 0.25s ease ${i * 0.05}s`, opacity: step >= 1 ? 1 : 0, transitionProperty: "transform, opacity" }}>{m}</span>
          ))}
        </div>
      </div>

      {/* Entry text */}
      {[
        { text: "Had a really productive morning — shipped the feature 🚀", delay: 2 },
        { text: "Evening walk cleared my head. Feeling grateful.", delay: 3 },
      ].map((l, i) => (
        <div key={i} className="fdemo-note-line" style={{ opacity: step >= l.delay ? 1 : 0, transform: step >= l.delay ? "none" : "translateY(6px)", transition: "all 0.38s ease", color: d ? "#cbd5e1" : "#374151" }}>
          {l.text}
        </div>
      ))}

      {/* Encrypted badge */}
      <div className="fdemo-enc-badge" style={{ opacity: step >= 4 ? 1 : 0, transition: "opacity 0.4s ease", background: d ? "#1e1b4b" : "#fdf2f8", borderColor: d ? "#4c1d95" : "#f9a8d4", color: "#ec4899" }}>
        🔐 End-to-end encrypted — only you can read this
      </div>
    </div>
  );
};

const HabitsDemo = ({ step, dark: d }) => {
  const habits = [
    { name: "Morning run 🏃", streak: 7,  checkAt: 1 },
    { name: "Read 30 min 📚", streak: 14, checkAt: 2 },
    { name: "Drink 2L water 💧", streak: 21, checkAt: 3 },
  ];
  return (
    <div className="fdemo-panel">
      <div className="fdemo-habit-header" style={{ color: d ? "#f1f5f9" : "#0f172a" }}>Today's Habits</div>

      {habits.map((h, i) => (
        <div key={h.name} className="fdemo-habit-row" style={{ background: d ? "#0f172a" : "#fff", borderColor: d ? "#1e293b" : "#e8edf3" }}>
          <div className={`fdemo-habit-check ${step > h.checkAt ? "fdemo-habit-check--done" : ""}`} style={{ borderColor: step > h.checkAt ? "#10b981" : d ? "#334155" : "#d1d5db", background: step > h.checkAt ? "#10b981" : "transparent" }}>
            {step > h.checkAt && <span className="fdemo-checkmark">✓</span>}
          </div>
          <span className="fdemo-habit-name" style={{ color: d ? "#e2e8f0" : "#1e293b", textDecoration: step > h.checkAt ? "line-through" : "none", opacity: step > h.checkAt ? 0.6 : 1 }}>{h.name}</span>
          <span className="fdemo-streak" style={{ opacity: step > h.checkAt ? 1 : 0, transition: "opacity 0.3s ease", background: d ? "#1a2e1f" : "#ecfdf5", color: "#10b981" }}>🔥 {h.streak}</span>
        </div>
      ))}

      {/* Progress bar */}
      <div className="fdemo-progress-wrap">
        <div className="fdemo-progress-bar-bg" style={{ background: d ? "#1e293b" : "#e8edf3" }}>
          <div className="fdemo-progress-fill" style={{ width: step >= 4 ? "100%" : step >= 3 ? "66%" : step >= 2 ? "33%" : "0%", background: "linear-gradient(90deg,#10b981,#34d399)", transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
        </div>
        <span style={{ fontSize: 11, color: d ? "#94a3b8" : "#64748b" }}>{step >= 4 ? "100" : step >= 3 ? "66" : step >= 2 ? "33" : "0"}% complete</span>
      </div>

      {/* Celebration */}
      <div className="fdemo-celebration" style={{ opacity: step >= 5 ? 1 : 0, transform: step >= 5 ? "scale(1)" : "scale(0.8)", transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)", background: d ? "#1a2e1f" : "#ecfdf5", borderColor: "#10b981", color: d ? "#4ade80" : "#065f46" }}>
        🎉 All habits complete! Great job today.
      </div>
    </div>
  );
};

const RemindersDemo = ({ step, dark: d }) => (
  <div className="fdemo-panel">
    {/* Note card */}
    <div className="fdemo-reminder-note" style={{ background: d ? "#1e293b" : "#fffbeb", borderColor: d ? "#334155" : "#fde68a" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: d ? "#f1f5f9" : "#0f172a", marginBottom: 6 }}>Dentist appointment prep</div>
      <div style={{ fontSize: 12, color: d ? "#94a3b8" : "#64748b" }}>Call Dr. Mehta to confirm tomorrow's slot. Bring insurance card.</div>
    </div>

    {/* Bell button */}
    <div className="fdemo-bell-row">
      <div className={`fdemo-bell-btn ${step >= 1 ? "fdemo-bell-btn--active" : ""}`} style={{ background: step >= 1 ? "#f59e0b" : d ? "#1e293b" : "#f8fafc", color: step >= 1 ? "#fff" : d ? "#94a3b8" : "#374151", borderColor: step >= 1 ? "#f59e0b" : d ? "#334155" : "#e2e8f0" }}>
        🔔 Set reminder
      </div>
    </div>

    {/* Picker */}
    <div className="fdemo-picker" style={{ opacity: step >= 2 ? 1 : 0, transform: step >= 2 ? "none" : "translateY(10px)", transition: "all 0.35s ease", background: d ? "#0f172a" : "#fff", borderColor: d ? "#334155" : "#e2e8f0" }}>
      <div className="fdemo-picker-row" style={{ color: d ? "#e2e8f0" : "#1e293b" }}>
        <span>📅</span> <strong>Tomorrow</strong> — Jun 28, 2026
      </div>
      <div className="fdemo-picker-row" style={{ color: d ? "#e2e8f0" : "#1e293b" }}>
        <span>⏰</span> <strong>9:00 AM</strong>
      </div>
      <div className="fdemo-picker-row" style={{ color: d ? "#e2e8f0" : "#1e293b" }}>
        <span>🔁</span> Does not repeat
      </div>
      <div className="fdemo-picker-confirm" style={{ background: "#f59e0b", opacity: step >= 3 ? 1 : 0.4, transition: "opacity 0.3s ease" }}>
        Confirm reminder
      </div>
    </div>

    {/* Toast notification */}
    <div className="fdemo-toast fdemo-toast--amber" style={{ opacity: step >= 4 ? 1 : 0, transform: step >= 4 ? "none" : "translateY(10px)", transition: "all 0.4s ease", background: d ? "#1c1507" : "#fffbeb", borderColor: "#f59e0b" }}>
      🔔 <span style={{ color: d ? "#fcd34d" : "#92400e" }}>Reminder set for tomorrow at 9:00 AM</span>
    </div>
  </div>
);

const LockedDemo = ({ step, dark: d }) => (
  <div className="fdemo-panel">
    <div className="fdemo-locked-card" style={{ background: d ? "#1e293b" : "#f5f3ff", borderColor: d ? "#4c1d95" : "#ddd6fe" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 700, color: d ? "#f1f5f9" : "#0f172a" }}>Private note</span>
        <span className={`fdemo-lock-icon ${step >= 3 ? "fdemo-lock-icon--open" : ""}`}>
          {step >= 3 ? "🔓" : "🔒"}
        </span>
      </div>

      {/* Blurred content */}
      <div className="fdemo-blurred-content" style={{ filter: step >= 3 ? "none" : "blur(5px)", transition: "filter 0.6s ease", color: d ? "#94a3b8" : "#374151", userSelect: step >= 3 ? "auto" : "none" }}>
        <p style={{ fontSize: 13, margin: "0 0 8px" }}>Bank account details — HDFC savings</p>
        <p style={{ fontSize: 13, margin: "0 0 8px" }}>Acc: ••••••• 4821 | IFSC: HDFC0001234</p>
        <p style={{ fontSize: 13, margin: 0 }}>Net banking password hint: old school name + year</p>
      </div>
    </div>

    {/* PIN entry */}
    <div className="fdemo-pin-dialog" style={{ opacity: step >= 1 && step < 4 ? 1 : 0, transform: step >= 1 && step < 4 ? "none" : "scale(0.95)", transition: "all 0.3s ease", background: d ? "#0f172a" : "#fff", borderColor: d ? "#334155" : "#e2e8f0" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: d ? "#e2e8f0" : "#374151", marginBottom: 12 }}>Enter PIN to unlock</div>
      <div className="fdemo-pin-dots">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`fdemo-pin-dot ${step >= 1 && i <= step - 1 ? "fdemo-pin-dot--filled" : ""}`} style={{ background: step >= 1 && i <= step - 1 ? "#8b5cf6" : d ? "#334155" : "#e2e8f0", borderColor: d ? "#4c1d95" : "#ddd6fe" }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: d ? "#64748b" : "#94a3b8", marginTop: 8 }}>4-digit PIN</div>
    </div>

    {/* Unlock badge */}
    <div className="fdemo-unlock-badge" style={{ opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? "translateY(0)" : "translateY(10px)", transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)", background: d ? "#1a1040" : "#f5f3ff", borderColor: "#8b5cf6", color: "#8b5cf6" }}>
      🔓 Note unlocked successfully
    </div>
  </div>
);

const AIDemo = ({ step, dark: d }) => (
  <div className="fdemo-panel">
    {/* Original text */}
    <div className="fdemo-ai-original" style={{ background: d ? "#1e293b" : "#f8fafc", borderColor: d ? "#334155" : "#e2e8f0" }}>
      <div className="fdemo-ai-label" style={{ color: d ? "#64748b" : "#94a3b8" }}>Original</div>
      <div style={{ fontSize: 13, color: d ? "#94a3b8" : "#374151", lineHeight: 1.6 }}>
        this meeting was ok i think we discussed some things and it was good overall maybe we should meet again sometime soon
      </div>
    </div>

    {/* AI Toolbar */}
    <div className="fdemo-ai-toolbar" style={{ opacity: step >= 1 ? 1 : 0, transition: "opacity 0.35s ease" }}>
      {[
        { label: "✨ Improve", active: step === 2 || step === 3, color: "#6366f1" },
        { label: "📝 Summarise", active: false, color: "#64748b" },
        { label: "🌐 Translate", active: false, color: "#64748b" },
        { label: "📈 Expand", active: false, color: "#64748b" },
      ].map((btn) => (
        <span key={btn.label} className="fdemo-ai-action" style={{ background: btn.active ? "#eef2ff" : d ? "#1e293b" : "#f8fafc", color: btn.active ? "#4338ca" : d ? "#94a3b8" : btn.color, borderColor: btn.active ? "#c7d2fe" : d ? "#334155" : "#e2e8f0", transform: btn.active ? "scale(1.05)" : "scale(1)", transition: "all 0.2s ease", fontWeight: btn.active ? 700 : 500 }}>
          {btn.label}
        </span>
      ))}
    </div>

    {/* Loader */}
    <div className="fdemo-ai-loading" style={{ opacity: step === 2 ? 1 : 0, transition: "opacity 0.3s ease" }}>
      <span className="fdemo-dot-pulse" /><span className="fdemo-dot-pulse" style={{ animationDelay: "0.15s" }} /><span className="fdemo-dot-pulse" style={{ animationDelay: "0.3s" }} />
      <span style={{ fontSize: 12, color: d ? "#64748b" : "#94a3b8", marginLeft: 4 }}>AI is improving…</span>
    </div>

    {/* Improved text */}
    <div className="fdemo-ai-result" style={{ opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? "none" : "translateY(10px)", transition: "all 0.4s ease", background: d ? "#0c1639" : "#eef2ff", borderColor: d ? "#1e1b4b" : "#c7d2fe" }}>
      <div className="fdemo-ai-label" style={{ color: "#6366f1" }}>✨ Improved</div>
      <div style={{ fontSize: 13, color: d ? "#a5b4fc" : "#1e40af", lineHeight: 1.65 }}>
        The meeting was productive and well-structured, covering key strategic initiatives. The team aligned on priorities and agreed to schedule a follow-up session to maintain momentum.
      </div>
    </div>
  </div>
);

const CollabDemo = ({ step, dark: d }) => {
  const users = [
    { name: "Rahul",  color: "#6366f1", avatar: "R", cursor: { top: "38%", left: "42%" } },
    { name: "Priya",  color: "#ec4899", avatar: "P", cursor: { top: "58%", left: "62%" } },
    { name: "You",    color: "#f97316", avatar: "Y", cursor: { top: "72%", left: "28%" } },
  ];
  const lines = [
    { text: "Project WriteUp — Sprint 12 Planning", bold: true, delay: 0 },
    { text: "Goal: Ship the collab feature by Friday", delay: 1 },
    { text: "• Assign tasks to each team member", delay: 2 },
    { text: "• Review PR #42 — real-time cursor sync", delay: 3 },
  ];
  return (
    <div className="fdemo-panel">
      {/* Active users bar */}
      <div className="fdemo-collab-bar" style={{ opacity: step >= 0 ? 1 : 0, transition: "opacity 0.4s ease" }}>
        <span className="fdemo-collab-bar-label" style={{ color: d ? "#94a3b8" : "#64748b" }}>Editing now:</span>
        <div className="fdemo-collab-avatars">
          {users.map((u, i) => (
            <div key={u.name} className="fdemo-collab-avatar" title={u.name}
              style={{ background: u.color, opacity: step >= i ? 1 : 0, transform: step >= i ? "scale(1)" : "scale(0.5)", transition: `all 0.3s ease ${i * 0.15}s`, zIndex: 3 - i }}>
              {u.avatar}
            </div>
          ))}
        </div>
        <span className="fdemo-live-pill">● LIVE</span>
      </div>

      {/* Shared note body */}
      <div className="fdemo-collab-doc" style={{ background: d ? "#0f172a" : "#fff", borderColor: d ? "#1e293b" : "#e2e8f0", position: "relative", flex: 1 }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            fontSize: l.bold ? 15 : 13, fontWeight: l.bold ? 700 : 400,
            color: d ? (l.bold ? "#f1f5f9" : "#cbd5e1") : (l.bold ? "#0f172a" : "#374151"),
            marginBottom: 8, lineHeight: 1.6,
            opacity: step >= l.delay ? 1 : 0,
            transform: step >= l.delay ? "none" : "translateY(6px)",
            transition: "all 0.35s ease",
          }}>{l.text}</div>
        ))}

        {/* Live cursors */}
        {users.map((u, i) => (
          <div key={u.name} className="fdemo-cursor-wrap"
            style={{ top: u.cursor.top, left: u.cursor.left, opacity: step >= i + 1 ? 1 : 0, transition: `opacity 0.4s ease ${i * 0.2}s` }}>
            <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
              <path d="M1 1L13 9.5L7.5 10.5L5 16.5L1 1Z" fill={u.color} stroke="#fff" strokeWidth="1.2"/>
            </svg>
            <span className="fdemo-cursor-label" style={{ background: u.color }}>{u.name}</span>
          </div>
        ))}
      </div>

      {/* Share link row */}
      <div className="fdemo-share-row" style={{ opacity: step >= 4 ? 1 : 0, transform: step >= 4 ? "none" : "translateY(8px)", transition: "all 0.4s ease" }}>
        <div className="fdemo-share-link" style={{ background: d ? "#1e293b" : "#f8fafc", borderColor: d ? "#334155" : "#e2e8f0", color: d ? "#94a3b8" : "#64748b" }}>
          🔗 writeup.app/collab/x9k2p…
        </div>
        <div className="fdemo-share-btn" style={{ background: "#f97316" }}>Copy link</div>
      </div>
    </div>
  );
};

// ── Demo renderer ─────────────────────────────────────────────────────────────
const DEMO_COMPONENTS = { notes: NotesDemo, diary: DiaryDemo, habits: HabitsDemo, reminders: RemindersDemo, locked: LockedDemo, ai: AIDemo, collab: CollabDemo };

// ── Main section ──────────────────────────────────────────────────────────────
export default function FeatureDemoSection({ dark: d = false, onGetStarted }) {
  const [active, setActive]     = useState(0);
  const [step, setStep]         = useState(0);
  const [animKey, setAnimKey]   = useState(0);
  const [progress, setProgress] = useState(0);

  const timerRef    = useRef(null);
  const progressRef = useRef(null);
  const stepRef     = useRef(null);
  const startRef    = useRef(Date.now());

  const clearAll = useCallback(() => {
    clearInterval(timerRef.current);
    clearInterval(progressRef.current);
    clearInterval(stepRef.current);
  }, []);

  const startTab = useCallback((idx) => {
    clearAll();
    setActive(idx);
    setStep(0);
    setProgress(0);
    setAnimKey((k) => k + 1);
    startRef.current = Date.now();

    // Advance step every ~1100ms (6 steps over 6.8s)
    let s = 0;
    stepRef.current = setInterval(() => {
      s += 1;
      if (s > 5) { clearInterval(stepRef.current); return; }
      setStep(s);
    }, 1100);

    // Smooth progress bar
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setProgress(Math.min((elapsed / DEMO_DURATION) * 100, 100));
    }, 30);

    // Auto-advance to next tab
    timerRef.current = setTimeout(() => {
      startTab((idx + 1) % TABS.length);
    }, DEMO_DURATION);
  }, [clearAll]);

  useEffect(() => {
    startTab(0);
    return clearAll;
  }, []); // eslint-disable-line

  const tab    = TABS[active];
  const DemoEl = DEMO_COMPONENTS[tab.id];

  return (
    <section id="preview" className={`fds-section ${d ? "fds-dark" : ""}`}>
      <div className="fds-heading-wrap">
        <div className="fds-badge">
          <span className="fds-badge-dot" />
          See it in action
        </div>
        <h2 className="fds-heading">
          Every tool you need,{" "}
          <span className="fds-heading-accent">live on screen</span>
        </h2>
        <p className="fds-sub">
          Watch how each feature works — no sign-up needed to explore.
        </p>
      </div>

      <div className="fds-layout">
        {/* ── Tab list ── */}
        <aside className="fds-tabs">
          {TABS.map((t, i) => {
            const isActive = i === active;
            return (
              <button
                key={t.id}
                className={`fds-tab ${isActive ? "fds-tab--active" : ""}`}
                style={{
                  "--tab-color": t.color,
                  background: isActive ? (d ? `${t.color}18` : `${t.color}10`) : "transparent",
                  borderColor:  isActive ? t.color : "transparent",
                }}
                onClick={() => startTab(i)}
              >
                <span className="fds-tab-icon" style={{ background: isActive ? (d ? `${t.color}25` : t.bg) : d ? "#1e293b" : "#f1f5f9" }}>
                  {t.emoji}
                </span>
                <span className="fds-tab-text">
                  <span className="fds-tab-title" style={{ color: isActive ? t.color : d ? "#e2e8f0" : "#374151" }}>{t.title}</span>
                  <span className="fds-tab-desc">{t.tagline}</span>
                </span>
                {/* Progress bar */}
                {isActive && (
                  <div className="fds-tab-progress-wrap">
                    <div className="fds-tab-progress-fill" style={{ width: `${progress}%`, background: t.color }} />
                  </div>
                )}
              </button>
            );
          })}
        </aside>

        {/* ── Demo panel ── */}
        <div className="fds-demo-wrap">
          {/* Info bar above the browser frame */}
          <div className="fds-info-bar">
            <div className="fds-info-text">
              <span className="fds-feature-emoji" style={{ background: d ? `${tab.color}22` : tab.bg }}>{tab.emoji}</span>
              <div>
                <div className="fds-feature-title" style={{ color: tab.color }}>{tab.title}</div>
                <div className="fds-feature-desc" style={{ color: d ? "#94a3b8" : "#64748b" }}>{tab.desc}</div>
              </div>
            </div>
            <button className="fds-try-btn" style={{ background: tab.color }} onClick={onGetStarted}>
              Try free →
            </button>
          </div>

          {/* Browser chrome frame */}
          <div className="fds-browser" style={{ borderColor: d ? "#1e293b" : "#e2e8f0", background: d ? "#0b0f1a" : "#f5f5f7" }}>
            <div className="fds-browser-bar" style={{ background: d ? "#1e293b" : "#e8edf3" }}>
              <span className="fds-dot" style={{ background: "#ef4444" }} />
              <span className="fds-dot" style={{ background: "#f59e0b" }} />
              <span className="fds-dot" style={{ background: "#22c55e" }} />
              <span className="fds-url-bar" style={{ background: d ? "#0f172a" : "#fff", color: d ? "#64748b" : "#94a3b8" }}>
                localhost:5173/dashboard
              </span>
              {/* Live indicator */}
              <span className="fds-live-badge">
                <span className="fds-live-dot" />
                LIVE
              </span>
            </div>

            {/* Demo content */}
            <div className="fds-demo-content" key={animKey} style={{ background: d ? "#0b0f1a" : "#fafafa" }}>
              {tab.video ? (
                // Real video when available
                <video
                  className="fds-video"
                  src={tab.video}
                  muted
                  loop
                  playsInline
                  autoPlay
                />
              ) : (
                // Animated mockup fallback
                <DemoEl step={step} dark={d} />
              )}
            </div>
          </div>

          {/* Mobile dots */}
          <div className="fds-mobile-dots">
            {TABS.map((_, i) => (
              <button
                key={i}
                className={`fds-mobile-dot ${i === active ? "fds-mobile-dot--active" : ""}`}
                style={{ background: i === active ? tab.color : d ? "#334155" : "#cbd5e1" }}
                onClick={() => startTab(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
