// src/pages/PremiumPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full premium upgrade page:
//   - Free vs Premium feature comparison table
//   - Monthly / Yearly plan toggle
//   - Razorpay checkout integration
//   - Post-payment success state
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import api from "../utils/axiosInstance";
import { usePremium } from "../context/PremiumContext";

// ── Feature comparison data ────────────────────────────────────────────────
const FEATURES = [
  { name: "Notes",                   free: true,  premium: true  },
  { name: "Search & Tags",           free: true,  premium: true  },
  { name: "Reminders",               free: true,  premium: true  },
  { name: "Archive & Trash",         free: true,  premium: true  },
  { name: "Export (PDF/MD/Text)",    free: true,  premium: true  },
  { name: "AI Tools (Summarize…)",   free: "3/day", premium: "Unlimited" },
  { name: "Personal Diary",          free: false, premium: true  },
  { name: "Mood Tracking",           free: false, premium: true  },
  { name: "Habit Tracker",           free: "3 habits", premium: "Unlimited" },
  { name: "Habit Analytics & Streaks", free: false, premium: true },
  { name: "Locked Notes (PIN)",      free: false, premium: true  },
  { name: "Priority Support",        free: false, premium: true  },
];

const PLANS = {
  monthly: { label: "Monthly", amount: 99,  amountPaise: 9900,  desc: "₹99 / month",  badge: null },
  yearly:  { label: "Yearly",  amount: 799, amountPaise: 79900, desc: "₹799 / year",  badge: "Save 33%" },
};

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const Cross = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Main component ─────────────────────────────────────────────────────────
const PremiumPage = ({ onClose }) => {
  const { isPremium, premiumPlan, premiumExpiresAt, refresh } = usePremium();
  const [plan,    setPlan]    = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  const handlePayment = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Create Razorpay order
      const { data: order } = await api.post("/api/payment/create-order", { plan });

      // 2. Open Razorpay checkout
      const options = {
        key:         order.key,
        amount:      order.amount,
        currency:    order.currency,
        name:        "WriteUp",
        description: `${PLANS[plan].label} Premium`,
        order_id:    order.orderId,
        prefill: {
          name:  order.userName,
          email: order.userEmail || "",
        },
        theme: { color: "#6366f1" },
        handler: async (response) => {
          try {
            // 3. Verify on backend
            await api.post("/api/payment/verify", {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan,
            });
            await refresh();    // update global context instantly
            setSuccess(true);
          } catch {
            setError("Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setError("Failed to initiate payment. Please try again.");
      setLoading(false);
    }
  };

  // ── Already premium ──────────────────────────────────────────────────────
  if (isPremium && !success) {
    const expiry = premiumExpiresAt
      ? new Date(premiumExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      : null;

    return (
      <div style={s.page}>
        <div style={s.alreadyCard}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>💎</div>
          <h2 style={s.alreadyTitle}>You're Premium!</h2>
          <p style={s.alreadySub}>
            Plan: <strong style={{ color: "#6366f1", textTransform: "capitalize" }}>{premiumPlan || "Premium"}</strong>
            {expiry && <> · Renews {expiry}</>}
          </p>
          <p style={s.alreadySub}>All features are unlocked for you. Enjoy WriteUp to the fullest! 🚀</p>
          {onClose && <button style={s.closeBtn} onClick={onClose}>Back to Dashboard</button>}
        </div>
      </div>
    );
  }

  // ── Payment success ──────────────────────────────────────────────────────
// In PremiumPage.jsx — replace the success block
if (success) {
  return (
    <div style={s.page}>
      <div style={s.successCard}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={s.alreadyTitle}>Welcome to Premium!</h2>
        <p style={s.alreadySub}>Your payment was successful. All premium features are now unlocked.</p>
        <div style={s.featureList}>
          {["📔 Personal Diary", "📊 Habit Tracker (Unlimited)", "🔒 Locked Notes", "🤖 Unlimited AI Tools"].map(f => (
            <div key={f} style={s.featureListItem}><Check /><span>{f}</span></div>
          ))}
        </div>
        {onClose && (
          <button
            style={{ ...s.successBtn, opacity: isPremium ? 1 : 0.6 }}
            onClick={onClose}
            disabled={!isPremium} // wait for context to confirm
          >
            {isPremium ? "Explore Premium Features →" : "Activating…"}
          </button>
        )}
      </div>
    </div>
  );
}

  return (
    <div style={s.page}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={s.header}>
        {onClose && (
          <button style={s.backBtn} onClick={onClose}>
            ← Back
          </button>
        )}
        <div style={s.gem}>💎</div>
        <h1 style={s.mainTitle}>Upgrade to Premium</h1>
        <p style={s.mainSub}>Unlock your full productivity potential with WriteUp Premium.</p>
      </div>

      {/* ── Plan toggle ──────────────────────────────────────────────────── */}
      <div style={s.planToggle}>
        {Object.entries(PLANS).map(([key, val]) => (
          <button
            key={key}
            style={{ ...s.planBtn, ...(plan === key ? s.planBtnActive : {}) }}
            onClick={() => setPlan(key)}
          >
            {val.label}
            {val.badge && <span style={s.saveBadge}>{val.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Price display ─────────────────────────────────────────────────── */}
      <div style={s.priceWrap}>
        <span style={s.currency}>₹</span>
        <span style={s.price}>{PLANS[plan].amount}</span>
        <span style={s.period}>/ {plan === "monthly" ? "month" : "year"}</span>
      </div>
      {plan === "yearly" && (
        <p style={s.perMonth}>Just ₹{(PLANS.yearly.amount / 12).toFixed(0)}/month — billed yearly</p>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && <div style={s.errBox}>{error}</div>}

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <button style={{ ...s.payBtn, opacity: loading ? 0.7 : 1 }} onClick={handlePayment} disabled={loading}>
        {loading ? "Opening payment…" : `💳 Get Premium — ₹${PLANS[plan].amount}`}
      </button>
      <p style={s.secure}>🔒 Secured by Razorpay · 256-bit SSL · Instant activation</p>

      {/* ── Feature comparison ───────────────────────────────────────────── */}
      <div style={s.tableWrap}>
        <h3 style={s.tableTitle}>What's included</h3>
        <div style={s.table}>
          {/* Header */}
          <div style={{ ...s.tableRow, ...s.tableHead }}>
            <div style={s.featureCol}>Feature</div>
            <div style={s.planCol}>Free</div>
            <div style={{ ...s.planCol, color: "#6366f1" }}>Premium</div>
          </div>

          {FEATURES.map((f, i) => (
            <div key={f.name} style={{ ...s.tableRow, background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
              <div style={s.featureCol}>{f.name}</div>

              <div style={s.planCol}>
                {f.free === true    ? <Check /> :
                 f.free === false   ? <Cross /> :
                 <span style={s.partial}>{f.free}</span>}
              </div>

              <div style={{ ...s.planCol, fontWeight: 600 }}>
                {f.premium === true   ? <Check /> :
                 f.premium === false  ? <Cross /> :
                 <span style={{ ...s.partial, color: "#6366f1" }}>{f.premium}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trust signals ─────────────────────────────────────────────────── */}
      <div style={s.trustRow}>
        {["🔐 Safe & Secure", "↩️ Cancel anytime", "⚡ Instant access", "🇮🇳 Made in India"].map(t => (
          <div key={t} style={s.trustItem}>{t}</div>
        ))}
      </div>
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────
const s = {
  page: {
    maxWidth:  640,
    margin:    "0 auto",
    padding:   "40px 20px 80px",
    fontFamily: "'Inter','Segoe UI',sans-serif",
    color:     "#0f172a",
  },
  header: {
    textAlign: "center",
    marginBottom: 32,
    position: "relative",
  },
  backBtn: {
    position:   "absolute",
    left:       0,
    top:        0,
    background: "none",
    border:     "none",
    fontSize:   14,
    color:      "#64748b",
    cursor:     "pointer",
    padding:    "4px 0",
    fontFamily: "inherit",
  },
  gem: { fontSize: 52, marginBottom: 12 },
  mainTitle: {
    fontSize:     32,
    fontWeight:   900,
    letterSpacing: "-1px",
    margin:       "0 0 10px",
    background:   "linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor:  "transparent",
  },
  mainSub: { fontSize: 16, color: "#64748b", margin: 0 },
  planToggle: {
    display:        "flex",
    justifyContent: "center",
    gap:            8,
    marginBottom:   28,
    background:     "#f1f5f9",
    borderRadius:   50,
    padding:        5,
    maxWidth:       280,
    margin:         "0 auto 28px",
  },
  planBtn: {
    flex:         1,
    padding:      "9px 20px",
    borderRadius: 40,
    border:       "none",
    background:   "transparent",
    fontFamily:   "inherit",
    fontWeight:   600,
    fontSize:     14,
    color:        "#64748b",
    cursor:       "pointer",
    display:      "flex",
    alignItems:   "center",
    gap:          6,
    justifyContent: "center",
    transition:   "all .2s",
  },
  planBtnActive: {
    background: "#fff",
    color:      "#0f172a",
    boxShadow:  "0 2px 8px rgba(0,0,0,0.1)",
  },
  saveBadge: {
    background:   "#22c55e",
    color:        "#fff",
    fontSize:     10,
    fontWeight:   700,
    padding:      "2px 6px",
    borderRadius: 20,
    letterSpacing: 0.5,
  },
  priceWrap: {
    textAlign:    "center",
    display:      "flex",
    alignItems:   "flex-start",
    justifyContent: "center",
    gap:          4,
    marginBottom: 4,
  },
  currency: { fontSize: 24, fontWeight: 700, color: "#6366f1", paddingTop: 8 },
  price:    { fontSize: 64, fontWeight: 900, color: "#0f172a", lineHeight: 1 },
  period:   { fontSize: 18, color: "#94a3b8", alignSelf: "flex-end", paddingBottom: 8 },
  perMonth: { textAlign: "center", fontSize: 13, color: "#22c55e", fontWeight: 600, margin: "0 0 20px" },
  errBox: {
    background:   "#fef2f2",
    border:       "1px solid #fecaca",
    borderRadius: 10,
    padding:      "10px 14px",
    fontSize:     13,
    color:        "#dc2626",
    margin:       "0 0 16px",
    textAlign:    "center",
  },
  payBtn: {
    display:      "block",
    width:        "100%",
    padding:      "16px",
    background:   "linear-gradient(135deg,#6366f1,#8b5cf6)",
    color:        "#fff",
    border:       "none",
    borderRadius: 14,
    fontSize:     17,
    fontWeight:   800,
    cursor:       "pointer",
    fontFamily:   "inherit",
    marginBottom: 10,
    boxShadow:    "0 8px 30px rgba(99,102,241,0.4)",
    transition:   "transform .15s",
    letterSpacing: "-0.3px",
  },
  secure: { textAlign: "center", fontSize: 12, color: "#94a3b8", marginBottom: 40 },
  tableWrap: { marginTop: 8 },
  tableTitle: {
    fontSize:     18,
    fontWeight:   700,
    margin:       "0 0 16px",
    color:        "#0f172a",
  },
  table: {
    border:       "1.5px solid #e2e8f0",
    borderRadius: 14,
    overflow:     "hidden",
  },
  tableRow: {
    display:    "flex",
    alignItems: "center",
    padding:    "11px 16px",
    borderBottom: "1px solid #f1f5f9",
    fontSize:   14,
  },
  tableHead: {
    background: "#f8fafc",
    fontWeight: 700,
    fontSize:   13,
    color:      "#475569",
    borderBottom: "2px solid #e2e8f0",
  },
  featureCol: { flex: 2, color: "#334155" },
  planCol: {
    flex:           1,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    color:          "#94a3b8",
  },
  partial: { fontSize: 12, fontWeight: 600, color: "#f59e0b" },
  trustRow: {
    display:        "flex",
    flexWrap:       "wrap",
    gap:            12,
    justifyContent: "center",
    marginTop:      36,
  },
  trustItem: {
    background:   "#f8fafc",
    border:       "1px solid #e2e8f0",
    borderRadius: 20,
    padding:      "6px 14px",
    fontSize:     12.5,
    fontWeight:   600,
    color:        "#475569",
  },
  // Already premium / success styles
  alreadyCard: {
    background:   "#fff",
    borderRadius: 24,
    padding:      "48px 36px",
    textAlign:    "center",
    maxWidth:     420,
    margin:       "60px auto",
    boxShadow:    "0 8px 48px rgba(0,0,0,0.08)",
    border:       "1px solid #e2e8f0",
  },
  successCard: {
    background:   "#fff",
    borderRadius: 24,
    padding:      "48px 36px",
    textAlign:    "center",
    maxWidth:     440,
    margin:       "60px auto",
    boxShadow:    "0 8px 48px rgba(0,0,0,0.1)",
    border:       "1.5px solid #6366f1",
  },
  alreadyTitle: { fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 12px", letterSpacing: "-0.5px" },
  alreadySub:   { fontSize: 14.5, color: "#64748b", lineHeight: 1.6, margin: "0 0 12px" },
  featureList: { margin: "20px 0 24px", textAlign: "left" },
  featureListItem: {
    display:     "flex",
    alignItems:  "center",
    gap:         10,
    fontSize:    14.5,
    color:       "#334155",
    padding:     "6px 0",
    fontWeight:  500,
  },
  closeBtn: {
    background:   "#f1f5f9",
    border:       "none",
    borderRadius: 10,
    padding:      "11px 24px",
    fontSize:     14,
    fontWeight:   700,
    cursor:       "pointer",
    fontFamily:   "inherit",
    color:        "#0f172a",
    marginTop:    8,
  },
  successBtn: {
    display:      "block",
    width:        "100%",
    padding:      "14px",
    background:   "linear-gradient(135deg,#6366f1,#8b5cf6)",
    color:        "#fff",
    border:       "none",
    borderRadius: 12,
    fontSize:     15,
    fontWeight:   700,
    cursor:       "pointer",
    fontFamily:   "inherit",
    marginTop:    4,
  },
};

export default PremiumPage;
