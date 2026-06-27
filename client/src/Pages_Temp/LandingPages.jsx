import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AuthModal from "./AuthModal";
import { LogoMark, LogoWordmark, LogoFull } from "../components/Logo";
import ReviewsSection from "../components/ReviewsSection";
import FeatureDemoSection from "../components/FeatureDemoSection";

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
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 5vw", height: 64,
      background: d ? "rgba(11,15,26,0.96)" : "rgba(255,255,255,0.96)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderBottom: `1px solid ${d ? "#1e293b" : "#e8edf3"}`,
      boxShadow: scrolled ? "0 1px 20px rgba(0,0,0,0.08)" : "0 1px 0 rgba(0,0,0,0.04)",
      transition: "box-shadow 0.3s ease",
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
      border: `1px solid ${d ? "#1e293b" : "#f0f0f0"}`,
      borderRadius: 18, padding: "28px 24px",
      transition: "transform .25s cubic-bezier(0.34,1.56,0.64,1), box-shadow .2s",
      cursor: "default",
      boxShadow: d ? "none" : "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
    },
    whyCard: {
      background: d ? "#0f172a" : "#fff",
      border: `1px solid ${d ? "#1e293b" : "#f0f0f0"}`,
      borderRadius: 16, padding: "28px 22px", textAlign: "center",
      transition: "transform .25s cubic-bezier(0.34,1.56,0.64,1), box-shadow .2s",
      boxShadow: d ? "none" : "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
    },
    dot: (c) => ({ width: 10, height: 10, borderRadius: "50%", background: c }),
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .wu-nav-link:hover { color: #6366f1 !important; }
        .wu-btn-outline:hover { background: #eef2ff !important; }
        .wu-feat-card:hover { transform: translateY(-6px) !important; box-shadow: 0 16px 40px rgba(99,102,241,.15) !important; }
        .wu-why-card:hover { transform: translateY(-4px) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; }
        .wu-big-fill:hover { opacity:.92 !important; transform: translateY(-2px) !important; box-shadow: 0 8px 24px rgba(99,102,241,0.4) !important; }
        .wu-big-outline:hover { background: ${d ? "#1e1b4b" : "#eef2ff"} !important; }
        .wu-cta-btn:hover { transform: translateY(-3px) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important; }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        /* ── LANDING PAGE RESPONSIVE ───────────────────────────────────── */

        /* Tablet (≤ 1024px) */
        @media (max-width: 1024px) {
          .wu-hero-section { padding: 144px 5vw 60px !important; }
          .wu-features-grid { grid-template-columns: repeat(auto-fit, minmax(220px,1fr)) !important; }
        }

        /* Tablet portrait (≤ 768px) */
        @media (max-width: 768px) {
          .wu-nav { padding: 0 4vw !important; height: 58px !important; }
          .wu-nav-links { display: none; }
          .wu-hero-section { padding: 134px 5vw 50px !important; }
          .wu-hero-sub { font-size: 16px !important; }
          .wu-hero-buttons { gap: 10px !important; }
          .wu-hero-btn-fill,
          .wu-hero-btn-outline { padding: 13px 24px !important; font-size: 15px !important; }
          .wu-features-grid { gap: 14px !important; }
          .wu-feat-card { padding: 22px 18px !important; }
          .wu-why-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
        }

        /* Phone (≤ 640px) */
        @media (max-width: 640px) {
          .wu-nav { padding: 0 16px !important; }
          .wu-nav-right { gap: 6px !important; }
          .wu-nav-login { display: none !important; }
          .wu-hero-section { padding: 124px 16px 40px !important; }
          .wu-hero-sub { font-size: 15px !important; max-width: 100% !important; }
          .wu-hero-buttons { flex-direction: column !important; align-items: stretch !important; }
          .wu-hero-btn-fill,
          .wu-hero-btn-outline { padding: 14px 20px !important; font-size: 15px !important; text-align: center !important; }
          .wu-features-grid { grid-template-columns: 1fr !important; max-width: 100% !important; }
          .wu-feat-card { padding: 18px 16px !important; }
          .wu-why-grid { grid-template-columns: 1fr 1fr !important; }
          .wu-section { padding: 48px 16px !important; }
          .wu-section-title { font-size: 24px !important; }
          .wu-section-sub { font-size: 14px !important; margin-bottom: 32px !important; }
          .wu-cta-section { padding: 64px 16px !important; }
          .wu-cta-title { font-size: 26px !important; }
          .wu-footer { padding: 28px 16px !important; flex-direction: column !important; gap: 20px !important; text-align: center !important; }
          .wu-footer-links { gap: 16px !important; flex-wrap: wrap !important; justify-content: center !important; }
        }

        /* Small phone (≤ 480px) */
        @media (max-width: 480px) {
          .wu-hero-section { padding: 116px 14px 36px !important; }
          .wu-hero-sub { font-size: 14px !important; }
          .wu-why-grid { grid-template-columns: 1fr !important; }
          .wu-why-card { padding: 18px 16px !important; }
          .wu-features-grid { gap: 10px !important; }
          .wu-feat-card-icon { width: 40px !important; height: 40px !important; }
          .wu-nav-get-started { padding: 7px 14px !important; font-size: 13px !important; }
        }

        /* Very small (≤ 360px) */
        @media (max-width: 360px) {
          .wu-hero-section { padding: 108px 12px 28px !important; }
          .wu-hero-btn-fill,
          .wu-hero-btn-outline { padding: 12px 16px !important; font-size: 14px !important; }
        }
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
      <nav className="wu-nav" style={s.nav}>
        <LogoFull size={34} dark={d} />
        <div className="wu-nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {[["preview","Features"],["why","Why us"],["reviews","Reviews"]].map(([id, label]) => (
            <button key={id} className="wu-nav-link" style={s.navLink} onClick={() => scrollTo(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="wu-nav-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ background:"none",border:"none",cursor:"pointer",fontSize:18,padding:"6px 8px",borderRadius:8,color:d?"#94a3b8":"#64748b" }}
            onClick={() => setDark(v => !v)}>{d ? "☀" : "☾"}</button>
          <button className="wu-btn-outline wu-nav-login" style={s.btnOutline} onClick={handleLogin}>Log in</button>
          <button className="wu-nav-get-started" style={s.btnFill} onClick={handleGetStarted}>Get started</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="wu-hero-section" style={{ padding: "164px 5vw 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Background glow orbs */}
        <div style={{ position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,#6366f120 0%,transparent 70%)",top:-150,left:"5%",pointerEvents:"none",filter:"blur(1px)" }}/>
        <div style={{ position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,#8b5cf620 0%,transparent 70%)",top:-50,right:"0%",pointerEvents:"none",filter:"blur(1px)" }}/>
        <div style={{ position:"absolute",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,#ec489920 0%,transparent 70%)",bottom:100,right:"15%",pointerEvents:"none" }}/>

        <div style={{ position: "relative" }}>
          <div style={{...s.badge, boxShadow: d ? "none" : "0 1px 8px rgba(99,102,241,0.15)"}}>
            <span style={{ width:7,height:7,borderRadius:"50%",background:"#6366f1",display:"inline-block",boxShadow:"0 0 6px #6366f1" }}/>
            All-in-one productivity workspace
          </div>

          <h1 style={s.h1}>
            Organize your life,{" "}
            <span style={{ background:"linear-gradient(135deg,#6366f1,#ec4899,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundSize:"200% 200%",animation:"gradient-shift 4s ease infinite" }}>
              one note
            </span>{" "}
            at a time.
          </h1>

          <p className="wu-hero-sub" style={s.heroSub}>
            Notes, diary, habits, and reminders — beautifully unified. Your thoughts, your goals — all in one secure place.
          </p>

          <div className="wu-hero-buttons" style={{ display:"flex",justifyContent:"center",gap:14,flexWrap:"wrap" }}>
            <button className="wu-big-fill wu-hero-btn-fill" style={s.bigBtnFill} onClick={handleGetStarted}>
              Start for free →
            </button>
            <button className="wu-big-outline wu-hero-btn-outline" style={s.bigBtnOutline} onClick={() => scrollTo("preview")}>
              See features
            </button>
          </div>

        </div>
      </section>

      {/* ── FEATURE DEMO VIDEOS ── */}
      <FeatureDemoSection dark={d} onGetStarted={handleGetStarted} />

      {/* ── WHY ── */}
      <section id="why" className="wu-section" style={s.section(d?"#0b0f1a":"#fff")}>
        <Reveal>
          <h2 className="wu-section-title" style={s.sectionTitle}>Why thousands choose Write Up</h2>
          <p className="wu-section-sub" style={s.sectionSub}>Simple. Powerful. Private. Built for real productivity.</p>
        </Reveal>
        <div className="wu-why-grid" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,maxWidth:860,margin:"0 auto" }}>
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

      {/* ── REVIEWS ── */}
      <div id="reviews"><ReviewsSection /></div>

      {/* ── FOOTER ── */}
      <footer className="wu-footer" style={{ padding:"40px 5vw",borderTop:`1px solid ${d?"#1e293b":"#e2e8f0"}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16 }}>
        <LogoFull size={30} dark={d} />
        <div className="wu-footer-links" style={{ display:"flex",gap:24 }}>
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
