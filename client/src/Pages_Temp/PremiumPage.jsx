// src/pages/PremiumPage.jsx
import React, { useState } from "react";
import api from "../utils/axiosInstance";
import { usePremium } from "../context/PremiumContext";

// ── Feature comparison — ACCURATE to what's actually implemented ──────────────
// AI Tools: No rate limiting exists — all users with the Groq key get access.
//           Free users are blocked at the premium gate in diary/habits.
//           AI panel has no gate, so it stays ✅ for free (it's a value-add).
// Habit Tracker: checkPremium blocks ALL habit routes for free users → ❌.
// "3/day" and "3 habits" claims were FALSE — corrected below.
const FEATURES = [
  { name: "Unlimited Notes",           free: true,  premium: true,  icon: "📝" },
  { name: "Search & Tags",             free: true,  premium: true,  icon: "🔍" },
  { name: "Smart Reminders",           free: true,  premium: true,  icon: "⏰" },
  { name: "Archive & Trash",           free: true,  premium: true,  icon: "🗂️" },
  { name: "Export (PDF / MD / Text)",  free: true,  premium: true,  icon: "📤" },
  { name: "AI Writing Tools",          free: true,  premium: true,  icon: "🤖" },
  { name: "Live Collaboration",        free: true,  premium: true,  icon: "👥" },
  { name: "Personal Diary (E2E encrypted)", free: false, premium: true, icon: "📔" },
  { name: "Mood Tracking",             free: false, premium: true,  icon: "😊" },
  { name: "Habit Tracker",             free: false, premium: true,  icon: "📊" },
  { name: "Habit Analytics & Streaks", free: false, premium: true,  icon: "🔥" },
  { name: "Habit Email Reminders",     free: false, premium: true,  icon: "📧" },
  { name: "Locked Notes (PIN)",        free: false, premium: true,  icon: "🔒" },
  { name: "Priority Support",          free: false, premium: true,  icon: "⚡" },
];

const PLANS = {
  monthly: { label: "Monthly", amount: 99,  amountPaise: 9900,  period: "month", badge: null },
  yearly:  { label: "Yearly",  amount: 799, amountPaise: 79900, period: "year",  badge: "Save 33%" },
};

const Check = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke="#22c55e">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const Cross = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Diamond SVG ───────────────────────────────────────────────────────────────
const DiamondIcon = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
    <defs>
      <linearGradient id="dg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#6366f1"/>
        <stop offset="50%" stopColor="#8b5cf6"/>
        <stop offset="100%" stopColor="#ec4899"/>
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <polygon points="28,4 52,18 52,38 28,52 4,38 4,18" fill="url(#dg)" filter="url(#glow)" opacity="0.95"/>
    <polygon points="28,4 52,18 28,26" fill="rgba(255,255,255,0.35)"/>
    <polygon points="4,18 28,26 28,4" fill="rgba(255,255,255,0.15)"/>
    <polygon points="28,26 52,38 28,52 4,38" fill="rgba(0,0,0,0.15)"/>
    <polygon points="28,26 52,18 52,38" fill="rgba(255,255,255,0.08)"/>
  </svg>
);

// ── Main Component ────────────────────────────────────────────────────────────
const PremiumPage = ({ onClose }) => {
  const { isPremium, premiumPlan, premiumExpiresAt, refresh } = usePremium();
  const [plan,    setPlan]    = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");
  const [hoveredRow, setHoveredRow] = useState(null);

  const handlePayment = async () => {
    setLoading(true); setError("");
    try {
      const { data: order } = await api.post("/api/payment/create-order", { plan });
      const options = {
        key:         order.key,
        amount:      order.amount,
        currency:    order.currency,
        name:        "WriteUp",
        description: `${PLANS[plan].label} Premium`,
        order_id:    order.orderId,
        prefill:     { name: order.userName, email: order.userEmail || "" },
        theme:       { color: "#6366f1" },
        handler: async (response) => {
          try {
            await api.post("/api/payment/verify", {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan,
            });
            await refresh();
            setSuccess(true);
          } catch {
            setError("Payment verification failed. Please contact support.");
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setError("Failed to initiate payment. Please try again.");
      setLoading(false);
    }
  };

  // ── Already premium ────────────────────────────────────────────────────────
  if (isPremium && !success) {
    const expiry = premiumExpiresAt
      ? new Date(premiumExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      : null;
    return (
      <div style={s.page}>
        <div style={s.alreadyCard}>
          <div style={{ fontSize: 56, marginBottom: 16, filter: "drop-shadow(0 4px 12px rgba(99,102,241,0.4))" }}>💎</div>
          <h2 style={s.alreadyTitle}>You're Premium!</h2>
          <p style={s.alreadySub}>
            Plan: <strong style={{ color: "#6366f1", textTransform: "capitalize" }}>{premiumPlan || "Premium"}</strong>
            {expiry && <> · Renews {expiry}</>}
          </p>
          <p style={s.alreadySub}>All features are unlocked. Enjoy WriteUp to the fullest! 🚀</p>
          {onClose && (
            <button style={s.successBtnStyle} onClick={onClose}>
              Continue to Dashboard →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Payment success ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={s.page}>
        <div style={s.successCard}>
          <div style={{ fontSize: 64, marginBottom: 16, lineHeight: 1 }}>🎉</div>
          <h2 style={s.alreadyTitle}>Welcome to Premium!</h2>
          <p style={s.alreadySub}>Payment verified. All premium features are now unlocked.</p>
          <div style={{ margin: "20px 0 24px", textAlign: "left" }}>
            {["📔 Personal Diary (E2E encrypted)", "📊 Habit Tracker (Unlimited)", "🔒 Locked Notes (PIN)", "🔥 Habit Streaks & Analytics"].map(f => (
              <div key={f} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", fontSize:14.5, color:"#334155", fontWeight:500 }}>
                <Check /><span>{f}</span>
              </div>
            ))}
          </div>
          {onClose && (
            <button
              style={{ ...s.successBtnStyle, opacity: isPremium ? 1 : 0.6 }}
              onClick={onClose}
              disabled={!isPremium}
            >
              {isPremium ? "Explore Premium Features →" : "Activating…"}
            </button>
          )}
        </div>
      </div>
    );
  }

  const isYearly = plan === "yearly";

  return (
    <div style={s.page}>

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="pp-hero" style={s.hero}>
        {onClose && (
          <button className="pp-back-btn" style={s.backBtn} onClick={onClose}>← Back</button>
        )}

        {/* Glow orbs */}
        <div style={s.orb1} />
        <div style={s.orb2} />

        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <DiamondIcon />
          </div>

          <div className="pp-pro-badge" style={s.proBadge}>✦ Premium Plan</div>

          <h1 className="pp-hero-title" style={s.heroTitle}>Upgrade to Premium</h1>
          <p className="pp-hero-sub" style={s.heroSub}>
            Unlock diary, habit tracking, analytics and more.<br/>
            Everything you need to build better habits and think clearly.
          </p>
        </div>
      </div>

      {/* ── Plan toggle ─────────────────────────────────────────────────────── */}
      <div className="pp-toggle-wrap" style={s.toggleWrap}>
        <div className="pp-toggle-inner" style={s.toggleInner}>
          {Object.entries(PLANS).map(([key, val]) => (
            <button
              key={key}
              className="pp-toggle-btn"
              style={{ ...s.toggleBtn, ...(plan === key ? s.toggleBtnActive : {}) }}
              onClick={() => setPlan(key)}
            >
              {val.label}
              {val.badge && <span style={s.saveBadge}>{val.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Price ───────────────────────────────────────────────────────────── */}
      <div style={s.priceBlock}>
        <div style={s.priceRow}>
          <span className="pp-currency" style={s.currency}>₹</span>
          <span className="pp-price-num" style={s.priceNum}>{PLANS[plan].amount}</span>
          <div style={s.priceMeta}>
            <span className="pp-per-period" style={s.perPeriod}>/ {PLANS[plan].period}</span>
            {isYearly && (
              <span style={s.perMonthNote}>
                ₹{(PLANS.yearly.amount / 12).toFixed(0)} / month
              </span>
            )}
          </div>
        </div>
        {isYearly && (
          <div style={s.savingPill}>
            🎉 You save ₹{(99 * 12 - 799)} compared to monthly
          </div>
        )}
      </div>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div style={s.errBox}>{error}</div>
      )}

      {/* ── CTA button ──────────────────────────────────────────────────────── */}
      <div className="pp-cta-area" style={{ padding: "0 28px 8px" }}>
        <button
          className="pp-cta-btn"
          style={{ ...s.ctaBtn, opacity: loading ? 0.72 : 1 }}
          onClick={handlePayment}
          disabled={loading}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(99,102,241,0.55)"; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(99,102,241,0.38)"; }}
        >
          {loading ? (
            <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
              <span style={{ width:16,height:16,border:"2.5px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"pp-spin 0.7s linear infinite" }}/>
              Opening payment…
            </span>
          ) : (
            <span>💳 Get Premium — ₹{PLANS[plan].amount}</span>
          )}
        </button>
        <p style={s.secure}>🔒 Secured by Razorpay · 256-bit SSL · Instant activation</p>
      </div>

      {/* ── Feature table ───────────────────────────────────────────────────── */}
      <div className="pp-table-section" style={s.tableSection}>
        <h3 className="pp-table-title" style={s.tableTitle}>What's included</h3>

        <div className="pp-table-wrap" style={s.tableWrap}>
          {/* Header */}
          <div style={s.tableHead}>
            <div style={{ flex: 3, fontWeight: 700, color: "#475569", fontSize: 13 }}>Feature</div>
            <div style={s.colHead}>Free</div>
            <div style={{ ...s.colHead, color: "#6366f1" }}>Premium</div>
          </div>

          {/* Rows */}
          {FEATURES.map((f, i) => (
            <div
              key={f.name}
              className="pp-table-row"
              style={{
                ...s.tableRow,
                background: hoveredRow === i ? "#f5f5ff" : i % 2 === 0 ? "#fafafa" : "#fff",
                borderLeft: !f.free ? "3px solid transparent" : "3px solid transparent",
                transition: "background 0.12s",
              }}
              onMouseEnter={() => setHoveredRow(i)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <div style={{ flex: 3, display:"flex", alignItems:"center", gap:9 }}>
                <span style={{ fontSize:16, lineHeight:1 }}>{f.icon}</span>
                <span className="pp-feature-name" style={{ fontSize:13.5, color: "#334155", fontWeight:500 }}>{f.name}</span>
                {!f.free && (
                  <span style={s.premiumOnlyBadge}>PRO</span>
                )}
              </div>
              <div style={s.col}>
                {f.free === true ? <Check /> : <Cross />}
              </div>
              <div style={{ ...s.col, fontWeight: 600 }}>
                {f.premium === true ? (
                  <Check />
                ) : (
                  <span style={{ fontSize:12,color:"#6366f1",fontWeight:700 }}>{f.premium}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trust row ───────────────────────────────────────────────────────── */}
      <div className="pp-trust-row" style={s.trustRow}>
        {[
          { icon: "🔐", text: "Safe & Secure" },
          { icon: "↩️", text: "Cancel anytime" },
          { icon: "⚡", text: "Instant access" },
          { icon: "🇮🇳", text: "Made in India" },
        ].map(t => (
          <div key={t.text} className="pp-trust-item" style={s.trustItem}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      {/* Responsive + Spin animation */}
      <style>{`
        @keyframes pp-spin { to { transform: rotate(360deg); } }

        /* Tablet (≤ 768px) */
        @media (max-width: 768px) {
          .pp-hero { padding: 32px 20px 24px !important; }
          .pp-price-num { font-size: clamp(48px, 12vw, 72px) !important; }
          .pp-table-section { padding: 20px 20px 0 !important; }
          .pp-toggle-wrap { padding: 0 20px !important; }
          .pp-cta-area { padding: 0 20px 8px !important; }
          .pp-trust-row { padding: 16px 20px 0 !important; }
        }

        /* Phone (≤ 640px) */
        @media (max-width: 640px) {
          .pp-hero { padding: 28px 16px 20px !important; border-radius: 0 0 24px 24px !important; }
          .pp-price-num { font-size: clamp(44px, 14vw, 64px) !important; }
          .pp-toggle-inner { gap: 2px !important; padding: 4px !important; }
          .pp-toggle-btn { padding: 8px 16px !important; font-size: 13.5px !important; }
          .pp-cta-btn { font-size: 16px !important; padding: 15px !important; border-radius: 14px !important; }
          .pp-table-row { padding: 10px 14px !important; }
          .pp-feature-name { font-size: 13px !important; }
          .pp-trust-item { padding: 6px 12px !important; font-size: 12px !important; }
          .pp-back-btn { font-size: 12px !important; padding: 4px 10px !important; }
        }

        /* Small phone (≤ 480px) */
        @media (max-width: 480px) {
          .pp-hero { padding: 24px 14px 18px !important; }
          .pp-hero-title { font-size: clamp(22px, 7vw, 30px) !important; letter-spacing: -0.5px !important; }
          .pp-hero-sub { font-size: 13.5px !important; }
          .pp-pro-badge { font-size: 10.5px !important; padding: 3px 12px !important; }
          .pp-price-num { font-size: clamp(40px, 16vw, 56px) !important; }
          .pp-currency { font-size: 20px !important; padding-top: 6px !important; }
          .pp-per-period { font-size: 15px !important; }
          .pp-table-section { padding: 16px 14px 0 !important; }
          .pp-table-title { font-size: 16px !important; }
          .pp-table-wrap { border-radius: 14px !important; }
          .pp-table-row { padding: 9px 12px !important; }
          .pp-trust-row { gap: 7px !important; padding: 14px 14px 0 !important; flex-wrap: wrap !important; }
          .pp-trust-item { font-size: 11.5px !important; padding: 5px 10px !important; }
        }

        /* Very small (≤ 360px) */
        @media (max-width: 360px) {
          .pp-toggle-btn { padding: 7px 12px !important; font-size: 12.5px !important; }
          .pp-trust-row { gap: 5px !important; }
        }
      `}</style>
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = {
  page: {
    maxWidth:   600,
    margin:     "0 auto",
    fontFamily: "'Inter','Segoe UI',sans-serif",
    color:      "#0f172a",
    paddingBottom: 48,
  },

  // Hero
  hero: {
    position:   "relative",
    overflow:   "hidden",
    textAlign:  "center",
    padding:    "40px 28px 32px",
    background: "linear-gradient(160deg, #faf5ff 0%, #ede9fe 40%, #e0e7ff 100%)",
    borderRadius: "0 0 32px 32px",
    marginBottom: 28,
  },
  orb1: {
    position:"absolute", width:300, height:300, borderRadius:"50%",
    background:"radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)",
    top:-80, left:-60, pointerEvents:"none",
  },
  orb2: {
    position:"absolute", width:250, height:250, borderRadius:"50%",
    background:"radial-gradient(circle,rgba(139,92,246,0.15) 0%,transparent 70%)",
    bottom:-60, right:-40, pointerEvents:"none",
  },
  backBtn: {
    position:"absolute", top:16, left:20,
    background:"rgba(255,255,255,0.7)", backdropFilter:"blur(4px)",
    border:"1px solid rgba(99,102,241,0.2)", borderRadius:8,
    fontSize:13, color:"#6366f1", cursor:"pointer",
    padding:"5px 12px", fontFamily:"inherit", fontWeight:600,
    zIndex:10,
  },
  proBadge: {
    display:"inline-flex", alignItems:"center", gap:6,
    padding:"4px 14px", borderRadius:20,
    background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.25)",
    color:"#6366f1", fontSize:12, fontWeight:700, letterSpacing:"0.06em",
    textTransform:"uppercase", marginBottom:14,
  },
  heroTitle: {
    fontSize: "clamp(24px,4vw,34px)",
    fontWeight: 900,
    letterSpacing: "-1px",
    margin: "0 0 10px",
    background: "linear-gradient(135deg,#4f46e5,#8b5cf6,#ec4899)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  heroSub: {
    fontSize: 15,
    color: "#64748b",
    lineHeight: 1.6,
    margin: 0,
  },

  // Plan toggle
  toggleWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 24,
    padding: "0 28px",
  },
  toggleInner: {
    display: "flex",
    background: "#f1f5f9",
    borderRadius: 40,
    padding: 5,
    border: "1.5px solid #e2e8f0",
    gap: 4,
  },
  toggleBtn: {
    padding: "9px 22px",
    borderRadius: 36,
    border: "none",
    background: "transparent",
    fontFamily: "inherit",
    fontWeight: 600,
    fontSize: 14,
    color: "#64748b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "all .2s",
  },
  toggleBtnActive: {
    background: "#fff",
    color: "#0f172a",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  saveBadge: {
    background: "linear-gradient(135deg,#22c55e,#16a34a)",
    color: "#fff",
    fontSize: 10,
    fontWeight: 800,
    padding: "2px 8px",
    borderRadius: 20,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Price
  priceBlock: {
    textAlign: "center",
    marginBottom: 24,
    padding: "0 28px",
  },
  priceRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 4,
  },
  currency: {
    fontSize: 26,
    fontWeight: 800,
    color: "#6366f1",
    paddingTop: 10,
    lineHeight: 1,
  },
  priceNum: {
    fontSize: 72,
    fontWeight: 900,
    color: "#0f172a",
    lineHeight: 1,
    letterSpacing: "-3px",
  },
  priceMeta: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    paddingBottom: 8,
    gap: 2,
    textAlign: "left",
  },
  perPeriod: {
    fontSize: 18,
    color: "#94a3b8",
    fontWeight: 500,
  },
  perMonthNote: {
    fontSize: 12,
    color: "#22c55e",
    fontWeight: 700,
  },
  savingPill: {
    display: "inline-block",
    marginTop: 10,
    padding: "5px 16px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    color: "#15803d",
  },

  // CTA
  ctaBtn: {
    display: "block",
    width: "100%",
    padding: "17px",
    background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    color: "#fff",
    border: "none",
    borderRadius: 16,
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
    marginBottom: 10,
    boxShadow: "0 6px 24px rgba(99,102,241,0.38)",
    transition: "transform .15s, box-shadow .15s",
    letterSpacing: "-0.2px",
  },
  secure: {
    textAlign: "center",
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 0,
  },
  errBox: {
    margin: "0 28px 16px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#dc2626",
    textAlign: "center",
  },

  // Feature table
  tableSection: {
    padding: "24px 28px 0",
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
    margin: "0 0 14px",
    letterSpacing: "-0.3px",
  },
  tableWrap: {
    border: "1.5px solid #e5e7eb",
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
  },
  tableHead: {
    display: "flex",
    alignItems: "center",
    padding: "12px 18px",
    background: "#f8fafc",
    borderBottom: "2px solid #e5e7eb",
  },
  colHead: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: 700,
    color: "#94a3b8",
  },
  tableRow: {
    display: "flex",
    alignItems: "center",
    padding: "11px 18px",
    borderBottom: "1px solid #f1f5f9",
    cursor: "default",
  },
  col: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
  },
  premiumOnlyBadge: {
    background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    color: "#fff",
    fontSize: 9,
    fontWeight: 800,
    padding: "1px 6px",
    borderRadius: 6,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    flexShrink: 0,
  },

  // Trust
  trustRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    padding: "20px 28px 0",
  },
  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#f5f5f7",
    border: "1px solid #ebebeb",
    borderRadius: 20,
    padding: "7px 16px",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#4b5563",
  },

  // Already premium / success
  alreadyCard: {
    background: "#fff",
    borderRadius: 24,
    padding: "48px 36px",
    textAlign: "center",
    maxWidth: 400,
    margin: "60px auto",
    boxShadow: "0 8px 48px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
  },
  successCard: {
    background: "#fff",
    borderRadius: 24,
    padding: "48px 36px",
    textAlign: "center",
    maxWidth: 440,
    margin: "60px auto",
    boxShadow: "0 8px 48px rgba(99,102,241,0.12)",
    border: "1.5px solid #c7d2fe",
  },
  alreadyTitle: {
    fontSize: 26,
    fontWeight: 800,
    color: "#0f172a",
    margin: "0 0 12px",
    letterSpacing: "-0.5px",
  },
  alreadySub: {
    fontSize: 14.5,
    color: "#64748b",
    lineHeight: 1.6,
    margin: "0 0 12px",
  },
  successBtnStyle: {
    display: "block",
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: 12,
    boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
    transition: "all 0.15s",
  },
};

export default PremiumPage;
