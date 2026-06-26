import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AuthModal from "./AuthModal";

// ── useInView hook ────────────────────────────────────────────────────────────
const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
};

const Reveal = ({ children, delay = 0 }) => {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
    }}>
      {children}
    </div>
  );
};

// ── Feature data ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    color: "#6366f1", bg: "#eef2ff", title: "Smart Notes",
    desc: "Rich text editor with images, videos, code blocks, AI tools, and tag-based organisation.",
  },
  {
    icon: (<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V5a2 2 0 012-2h14v16H6.5A2.5 2.5 0 014 19.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    color: "#ec4899", bg: "#fdf2f8", title: "Personal Diary",
    desc: "PIN-protected private diary with mood tracking, colour themes, and past-entry search.",
  },
  {
    icon: (<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    color: "#f59e0b", bg: "#fffbeb", title: "Smart Reminders",
    desc: "Set date/time reminders with daily or weekly repeats, just like Google Keep.",
  },
  {
    icon: (<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M3 3v18h18M7 16l4-4 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
    color: "#10b981", bg: "#ecfdf5", title: "Habit Tracker",
    desc: "Track daily and weekly habits with streaks, charts, and email congratulations.",
  },
  {
    icon: (<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
    color: "#8b5cf6", bg: "#f5f3ff", title: "Locked Notes",
    desc: "Protect sensitive notes with a PIN. Hidden from view until unlocked.",
  },
  {
    icon: (<svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>),
    color: "#06b6d4", bg: "#ecfeff", title: "AI Tools",
    desc: "Summarise, improve, translate, expand, and analyse mood — all with one click.",
  },
];

const WHY = [
  { icon: "⚡", title: "All-in-one", desc: "Notes, diary, habits, and reminders in a single app." },
  { icon: "🎨", title: "Beautiful UI", desc: "Clean, minimal design inspired by top productivity apps." },
  { icon: "🔒", title: "Private & secure", desc: "PIN locks, encrypted storage, no ads." },
  { icon: "📱", title: "Every device", desc: "Fully responsive across phone, tablet, and desktop." },
];

// ── LandingPage ───────────────────────────────────────────────────────────────
const LandingPage = () => {
  const navigate = useNavigate();
  const [dark, setDark]             = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const [modal, setModal]           = useState(null); // null | "login" | "signup"

  // Check if already logged in
  const isLoggedIn = () => !!localStorage.getItem("wu_token");

  useEffect(() => {
    const saved = localStorage.getItem("wu-landing-dark");
    if (saved === "true") setDark(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("wu-landing-dark", dark);
  }, [dark]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modal]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleGetStarted = () => {
    if (isLoggedIn()) { navigate("/dashboard"); }
    else { setModal("signup"); }
  };

  const handleLogin = () => {
    if (isLoggedIn()) { navigate("/dashboard"); }
    else { setModal("login"); }
  };

  const d = dark;

  const s = {
    page: {
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      background: d ? "#0b0f1a" : "#ffffff",
      color: d ? "#e2e8f0" : "#0f172a",
      minHeight: "100vh",
      overflowX: "hidden",
    },
    nav: {
      position: "sticky", top: 0, zIndex: 99,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 5vw", height: 64,
      background: scrolled
        ? d ? "rgba(11,15,26,0.92)" : "rgba(255,255,255,0.92)"
        : "transparent",
      backdropFilter: scrolled ? "blur(12px)" : "none",
      borderBottom: scrolled ? `1px solid ${d ? "#1e293b" : "#e2e8f0"}` : "none",
      transition: "all 0.3s ease",
    },
    logo: {
      fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px",
      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      cursor: "pointer",
    },
    navLink: {
      fontSize: 14, fontWeight: 500, color: d ? "#94a3b8" : "#64748b",
      cursor: "pointer", transition: "color .15s", textDecoration: "none",
      background: "none", border: "none", fontFamily: "inherit",
    },
    btnOutline: {
      padding: "8px 20px", border: "1.5px solid #6366f1", borderRadius: 10,
      fontSize: 14, fontWeight: 600, color: "#6366f1", background: "transparent",
      cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
    },
    btnFill: {
      padding: "8px 20px", border: "none", borderRadius: 10,
      fontSize: 14, fontWeight: 600, color: "#fff",
      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      cursor: "pointer", fontFamily: "inherit",
    },
    badge: {
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 14px", borderRadius: 20,
      background: d ? "#1e1b4b" : "#eef2ff",
      color: d ? "#a5b4fc" : "#4f46e5",
      fontSize: 13, fontWeight: 500, marginBottom: 24,
    },
    h1: {
      fontSize: "clamp(36px,5vw,66px)", fontWeight: 800,
      lineHeight: 1.12, letterSpacing: "-2px",
      margin: "0 auto 20px", maxWidth: 760,
      color: d ? "#f1f5f9" : "#0f172a",
    },
    heroSub: {
      fontSize: 18, color: d ? "#94a3b8" : "#64748b",
      maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.6,
    },
    bigBtnFill: {
      padding: "14px 32px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
      color: "#fff", border: "none", borderRadius: 12,
      fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
      transition: "opacity .15s, transform .15s",
    },
    bigBtnOutline: {
      padding: "14px 32px", background: "transparent",
      color: d ? "#a5b4fc" : "#6366f1",
      border: `2px solid ${d ? "#4338ca" : "#6366f1"}`,
      borderRadius: 12, fontSize: 16, fontWeight: 700,
      cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
    },
    section: (bg) => ({ padding: "80px 5vw", background: bg }),
    sectionTitle: {
      fontSize: "clamp(26px,3vw,38px)", fontWeight: 800, letterSpacing: "-1px",
      textAlign: "center", color: d ? "#f1f5f9" : "#0f172a", marginBottom: 12,
    },
    sectionSub: {
      fontSize: 16, color: d ? "#94a3b8" : "#64748b", textAlign: "center",
      maxWidth: 520, margin: "0 auto 48px", lineHeight: 1.6,
    },
    featureCard: {
      background: d ? "#0f172a" : "#fff",
      border: `1px solid ${d ? "#1e293b" : "#e2e8f0"}`,
      borderRadius: 16, padding: "28px 24px",
      transition: "transform .2s, box-shadow .2s", cursor: "default",
    },
    whyCard: {
      background: d ? "#0f172a" : "#fff",
      border: `1px solid ${d ? "#1e293b" : "#e2e8f0"}`,
      borderRadius: 14, padding: "24px 20px", textAlign: "center",
      transition: "transform .2s",
    },
    dot: (c) => ({ width: 10, height: 10, borderRadius: "50%", background: c }),
  };

  const noteColors = ["#fef9c3","#dcfce7","#dbeafe","#fce7f3","#ede9fe"];
  const notes = [
    { title: "Meeting notes", body: "Discuss Q2 roadmap…", tag: "#work",     color: noteColors[2] },
    { title: "Book list",     body: "Atomic Habits, SICP…", tag: "#reading", color: noteColors[0] },
    { title: "IPL score",     body: "CSK vs MI thriller!",  tag: "#sports",  color: noteColors[1] },
    { title: "Grocery",       body: "Milk, eggs, bread…",   tag: "#personal",color: noteColors[3] },
    { title: "React ideas",   body: "Habit chart with D3…", tag: "#dev",     color: noteColors[4] },
    { title: "Weekend plan",  body: "Hike + dinner at 8",   tag: "#life",    color: noteColors[0] },
  ];

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .wu-nav-link:hover { color: #6366f1 !important; }
        .wu-btn-outline:hover { background: #eef2ff !important; }
        .wu-feat-card:hover { transform: translateY(-4px) !important; box-shadow: 0 12px 32px rgba(99,102,241,.12) !important; }
        .wu-why-card:hover { transform: translateY(-3px) !important; }
        .wu-big-fill:hover { opacity:.88 !important; transform: translateY(-2px) !important; }
        .wu-big-outline:hover { background: ${d ? "#1e1b4b" : "#eef2ff"} !important; }
        .wu-cta-btn:hover { transform: translateY(-2px) !important; }
      `}</style>

      {/* ── AUTH MODAL ── */}
      {modal && (
        <AuthModal
          mode={modal}
          onClose={() => setModal(null)}
          onSwitchMode={() => setModal(modal === "login" ? "signup" : "login")}
        />
      )}

      {/* ── NAVBAR ── */}
      <nav style={s.nav}>
        <span style={s.logo}>Write Up.</span>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {[["features","Features"],["preview","Preview"],["why","Why us"]].map(([id, label]) => (
            <button key={id} className="wu-nav-link" style={s.navLink} onClick={() => scrollTo(id)}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ background:"none",border:"none",cursor:"pointer",fontSize:18,padding:"6px 8px",borderRadius:8,color:d?"#94a3b8":"#64748b" }}
            onClick={() => setDark(v => !v)}>{d ? "☀" : "☾"}</button>
          <button className="wu-btn-outline" style={s.btnOutline} onClick={handleLogin}>Log in</button>
          <button style={s.btnFill} onClick={handleGetStarted}>Get started</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: "100px 5vw 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,#6366f118 0%,transparent 70%)",top:-100,left:"10%",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,#8b5cf618 0%,transparent 70%)",top:0,right:"5%",pointerEvents:"none" }}/>

        <div style={{ position: "relative" }}>
          <div style={s.badge}>
            <span style={{ width:7,height:7,borderRadius:"50%",background:"#6366f1",display:"inline-block" }}/>
            All-in-one productivity workspace
          </div>

          <h1 style={s.h1}>
            Organize your life,{" "}
            <span style={{ background:"linear-gradient(135deg,#6366f1,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
              one note
            </span>{" "}
            at a time.
          </h1>

          <p style={s.heroSub}>
            Notes, diary, habits, and reminders — beautifully unified. Your thoughts, your goals — all in one secure place.
          </p>

          <div style={{ display:"flex",justifyContent:"center",gap:14,flexWrap:"wrap" }}>
            <button className="wu-big-fill" style={s.bigBtnFill} onClick={handleGetStarted}>
              Start for free →
            </button>
            <button className="wu-big-outline" style={s.bigBtnOutline} onClick={() => scrollTo("features")}>
              See features
            </button>
          </div>

          {/* Stats */}
          <div style={{ display:"flex",justifyContent:"center",gap:40,marginTop:48,flexWrap:"wrap" }}>
            {[["10k+","Notes created"],["500+","Daily users"],["99%","Uptime"]].map(([n,l]) => (
              <div key={n} style={{ textAlign:"center" }}>
                <div style={{ fontSize:28,fontWeight:800,color:d?"#f1f5f9":"#0f172a" }}>{n}</div>
                <div style={{ fontSize:13,color:d?"#94a3b8":"#64748b",marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* App mockup */}
          <div id="preview" style={{
            margin:"60px auto 0", maxWidth:860, borderRadius:20,
            border:`1px solid ${d?"#1e293b":"#e2e8f0"}`,
            background:d?"#0f172a":"#f8fafc", overflow:"hidden",
          }}>
            <div style={{ display:"flex",alignItems:"center",gap:6,padding:"10px 16px",background:d?"#1e293b":"#e2e8f0" }}>
              {["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={s.dot(c)}/>)}
              <span style={{ marginLeft:10,fontSize:12,color:d?"#64748b":"#94a3b8" }}>localhost:5173/dashboard</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:`1px solid ${d?"#1e293b":"#e2e8f0"}`,background:d?"#0f172a":"#fff" }}>
              <span style={{ fontWeight:700,fontSize:14,color:d?"#f1f5f9":"#0f172a" }}>Write Up.</span>
              <div style={{ flex:1,maxWidth:280,height:28,borderRadius:7,background:d?"#1e293b":"#f1f5f9",display:"flex",alignItems:"center",padding:"0 10px",fontSize:12,color:d?"#64748b":"#94a3b8" }}>
                Search your notes…
              </div>
              <div style={{ marginLeft:"auto",display:"flex",gap:6 }}>
                {["Notes","Diary","Habits"].map(t => (
                  <span key={t} style={{ fontSize:12,padding:"4px 10px",borderRadius:6,background:t==="Notes"?"#6366f1":d?"#1e293b":"#f1f5f9",color:t==="Notes"?"#fff":d?"#94a3b8":"#64748b",fontWeight:500 }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ padding:20,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,background:d?"#0b0f1a":"#f8fafc" }}>
              {notes.map((n,i) => (
                <div key={i} style={{ borderRadius:10,background:d?"#1e293b":n.color,padding:"12px 12px 9px",border:`1px solid ${d?"#334155":"rgba(0,0,0,0.06)"}` }}>
                  <div style={{ fontSize:12.5,fontWeight:700,color:d?"#f1f5f9":"#1e293b",marginBottom:5 }}>{n.title}</div>
                  <div style={{ fontSize:11,color:d?"#94a3b8":"#475569",lineHeight:1.5,marginBottom:8 }}>{n.body}</div>
                  <span style={{ fontSize:10,padding:"2px 7px",borderRadius:10,background:"rgba(99,102,241,.12)",color:"#6366f1",fontWeight:600 }}>{n.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={s.section(d?"#0f172a":"#f8fafc")}>
        <Reveal>
          <h2 style={s.sectionTitle}>Everything you need, nothing you don't</h2>
          <p style={s.sectionSub}>Six powerful tools in one app — built for people who want to think clearly and live intentionally.</p>
        </Reveal>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20,maxWidth:1060,margin:"0 auto" }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.07}>
              <div className="wu-feat-card" style={s.featureCard}>
                <div style={{ width:46,height:46,borderRadius:12,background:d?`${f.color}22`:f.bg,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16 }}>
                  <span style={{ color:f.color }}>{f.icon}</span>
                </div>
                <div style={{ fontSize:16,fontWeight:700,color:d?"#f1f5f9":"#0f172a",marginBottom:8 }}>{f.title}</div>
                <div style={{ fontSize:14,color:d?"#94a3b8":"#64748b",lineHeight:1.6 }}>{f.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── WHY ── */}
      <section id="why" style={s.section(d?"#0b0f1a":"#fff")}>
        <Reveal>
          <h2 style={s.sectionTitle}>Why thousands choose Write Up</h2>
          <p style={s.sectionSub}>Simple. Powerful. Private. Built for real productivity.</p>
        </Reveal>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,maxWidth:860,margin:"0 auto" }}>
          {WHY.map((w,i) => (
            <Reveal key={w.title} delay={i*0.08}>
              <div className="wu-why-card" style={s.whyCard}>
                <div style={{ fontSize:28,marginBottom:10 }}>{w.icon}</div>
                <div style={{ fontSize:15,fontWeight:700,color:d?"#f1f5f9":"#0f172a",marginBottom:6 }}>{w.title}</div>
                <div style={{ fontSize:13.5,color:d?"#94a3b8":"#64748b",lineHeight:1.55 }}>{w.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:"100px 5vw",textAlign:"center",background:d?"linear-gradient(135deg,#1e1b4b,#0f172a)":"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
        <Reveal>
          <h2 style={{ fontSize:"clamp(28px,4vw,48px)",fontWeight:800,color:"#fff",marginBottom:14,letterSpacing:"-1px" }}>
            Start organizing your life today
          </h2>
          <p style={{ fontSize:17,color:"#c7d2fe",marginBottom:36,lineHeight:1.6 }}>
            Free forever. No credit card needed. Just sign in and go.
          </p>
          <button
            className="wu-cta-btn"
            style={{ padding:"16px 40px",background:"#fff",color:"#6366f1",border:"none",borderRadius:12,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"transform .15s" }}
            onClick={handleGetStarted}
          >
            Get started for free →
          </button>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding:"40px 5vw",borderTop:`1px solid ${d?"#1e293b":"#e2e8f0"}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16 }}>
        <span style={s.logo}>Write Up.</span>
        <div style={{ display:"flex",gap:24 }}>
          {["About","Features","Contact","Privacy"].map(l => (
            <a key={l} href="#" style={{ fontSize:13,color:d?"#64748b":"#94a3b8",textDecoration:"none" }}>{l}</a>
          ))}
        </div>
        <div style={{ fontSize:12,color:d?"#475569":"#94a3b8" }}>© 2026 Write Up. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default LandingPage;
