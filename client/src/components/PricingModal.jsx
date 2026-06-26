// src/components/PricingModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal that shows Free vs Premium comparison + plan picker.
// Loads Razorpay checkout script, creates an order, and handles the flow.
// On success → calls usePremium().unlockPremium() to update global state.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { usePremium } from "../context/PremiumContext";
import api from "../utils/axiosInstance";

// ── Plan data ─────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id:       "monthly",
    label:    "Monthly",
    price:    "₹99",
    per:      "/month",
    desc:     "Perfect to try out premium",
    badge:    null,
    highlight: false,
  },
  {
    id:       "yearly",
    label:    "Yearly",
    price:    "₹799",
    per:      "/year",
    desc:     "Save ₹389 vs monthly",
    badge:    "BEST VALUE",
    highlight: true,
  },
  {
    id:       "lifetime",
    label:    "Lifetime",
    price:    "₹1999",
    per:      "one-time",
    desc:     "Pay once, use forever",
    badge:    null,
    highlight: false,
  },
];

// ── Feature comparison rows ───────────────────────────────────────────────────
const COMPARISON = [
  { feature: "Smart Notes",               free: true,  premium: true },
  { feature: "Smart Reminders",           free: true,  premium: true },
  { feature: "Locked Notes (PIN)",        free: true,  premium: true },
  { feature: "Note export (PDF/MD)",      free: true,  premium: true },
  { feature: "Personal Diary",            free: false, premium: true },
  { feature: "Diary mood tracking",       free: false, premium: true },
  { feature: "Habit Tracker",             free: false, premium: true },
  { feature: "Habit charts & analytics",  free: false, premium: true },
  { feature: "AI Tools (summarize, etc)", free: false, premium: true },
  { feature: "Email habit reminders",     free: false, premium: true },
  { feature: "Priority support",          free: false, premium: true },
];

const Tick = ({ ok }) => ok
  ? <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span>
  : <span style={{ color: "#ef4444", opacity: 0.5 }}>✗</span>;

// ── Load Razorpay script once ─────────────────────────────────────────────────
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

// ── PricingModal ──────────────────────────────────────────────────────────────
const PricingModal = ({ onClose }) => {
  const { unlockPremium } = usePremium();
  const [selectedPlan, setSelectedPlan] = useState("yearly");
  const [processing,   setProcessing]   = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState(false);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handlePayment = async () => {
    setError("");
    setProcessing(true);

    // 1. Load Razorpay SDK
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setError("Could not load payment gateway. Check your internet connection.");
      setProcessing(false);
      return;
    }

    try {
      // 2. Create order on backend
      const { data: order } = await api.post("/api/payment/create-order", { plan: selectedPlan });

      // 3. Open Razorpay checkout
      const rzp = new window.Razorpay({
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        order_id:    order.orderId,
        name:        "Write Up Premium",
        description: order.label,
        image:       "/logo (1).png",
        prefill: {
          name:  order.user.name,
          email: order.user.email,
        },
        theme:       { color: "#6366f1" },

        handler: async (response) => {
          // 4. Verify payment on backend
          try {
            const verify = await api.post("/api/payment/verify", {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan:                selectedPlan,
            });

            // 5. Update global premium state instantly — no page reload
            unlockPremium(verify.data);
            setSuccess(true);
            setProcessing(false);
          } catch (verifyErr) {
            setError(verifyErr.response?.data?.message || "Payment verification failed.");
            setProcessing(false);
          }
        },

        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      });

      rzp.open();
    } catch (orderErr) {
      setError(orderErr.response?.data?.message || "Could not start payment. Try again.");
      setProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,0.65)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, overflowY: "auto",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 24, width: "100%", maxWidth: 820,
        padding: "40px 36px 32px", position: "relative",
        boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
        fontFamily: "'Inter','Segoe UI',sans-serif",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16, background: "none",
          border: "none", cursor: "pointer", fontSize: 22, color: "#94a3b8", padding: 4,
        }}>✕</button>

        {success ? (
          /* ── SUCCESS STATE ── */
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
              Welcome to Premium!
            </h2>
            <p style={{ color: "#64748b", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
              All premium features are now unlocked. Enjoy your Write Up experience!
            </p>
            <button
              onClick={onClose}
              style={{
                padding: "13px 36px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", border: "none", borderRadius: 12,
                fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}
            >
              Start exploring →
            </button>
          </div>
        ) : (
          <>
            {/* ── HEADER ── */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{
                display: "inline-block", padding: "4px 14px", borderRadius: 20,
                background: "#eef2ff", color: "#6366f1", fontSize: 13, fontWeight: 600,
                marginBottom: 12,
              }}>
                💎 Premium Plans
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", marginBottom: 8 }}>
                Unlock the full experience
              </h2>
              <p style={{ color: "#64748b", fontSize: 15 }}>
                Upgrade to access Diary, Habit Tracker, AI Tools and more.
              </p>
            </div>

            {/* ── PLAN CARDS ── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
              gap: 14, marginBottom: 32,
            }}>
              {PLANS.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  style={{
                    border: `2px solid ${selectedPlan === plan.id ? "#6366f1" : "#e2e8f0"}`,
                    borderRadius: 14, padding: "20px 18px",
                    cursor: "pointer", position: "relative",
                    background: selectedPlan === plan.id ? "#eef2ff" : "#fafafa",
                    transition: "all .15s",
                  }}
                >
                  {plan.badge && (
                    <div style={{
                      position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      color: "#fff", fontSize: 10, fontWeight: 800,
                      padding: "3px 10px", borderRadius: 20, letterSpacing: 0.5,
                      whiteSpace: "nowrap",
                    }}>
                      {plan.badge}
                    </div>
                  )}
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: `2px solid ${selectedPlan === plan.id ? "#6366f1" : "#cbd5e1"}`,
                    background: selectedPlan === plan.id ? "#6366f1" : "transparent",
                    marginBottom: 12, transition: "all .15s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {selectedPlan === plan.id && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
                    )}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{plan.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#6366f1" }}>
                    {plan.price}
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8" }}>{plan.per}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{plan.desc}</div>
                </div>
              ))}
            </div>

            {/* ── COMPARISON TABLE ── */}
            <div style={{
              border: "1px solid #e2e8f0", borderRadius: 14,
              overflow: "hidden", marginBottom: 28,
            }}>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 80px 80px",
                background: "#f8fafc", padding: "10px 16px",
                fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: 0.5,
              }}>
                <span>FEATURE</span>
                <span style={{ textAlign: "center" }}>FREE</span>
                <span style={{ textAlign: "center", color: "#6366f1" }}>PREMIUM</span>
              </div>
              {COMPARISON.map((row, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1fr 80px 80px",
                  padding: "10px 16px", borderTop: "1px solid #f1f5f9",
                  background: i % 2 === 0 ? "#fff" : "#fafafa",
                  fontSize: 13.5, color: "#374151", alignItems: "center",
                }}>
                  <span>{row.feature}</span>
                  <span style={{ textAlign: "center" }}><Tick ok={row.free} /></span>
                  <span style={{ textAlign: "center" }}><Tick ok={row.premium} /></span>
                </div>
              ))}
            </div>

            {/* ── ERROR ── */}
            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 8, padding: "10px 14px", fontSize: 13,
                color: "#dc2626", marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            {/* ── PAY BUTTON ── */}
            <button
              onClick={handlePayment}
              disabled={processing}
              style={{
                width: "100%", padding: "14px",
                background: processing
                  ? "#c7d2fe"
                  : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", border: "none", borderRadius: 12,
                fontSize: 16, fontWeight: 700, cursor: processing ? "default" : "pointer",
                fontFamily: "inherit", transition: "opacity .15s",
              }}
            >
              {processing ? "Processing…" : `Pay & Unlock Premium →`}
            </button>

            <p style={{
              textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 12,
            }}>
              🔒 Secured by Razorpay · 100% safe payment · Cancel anytime
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PricingModal;
