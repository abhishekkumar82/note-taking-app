// src/components/PremiumGate.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wraps any premium-only section.
// When the user is NOT premium:
//   • Blurs / dims the child content
//   • Shows an overlay with an "Upgrade" button that opens PricingModal
// When the user IS premium:
//   • Renders children normally, no overlay
//
// Usage:
//   <PremiumGate feature="Personal Diary">
//     <DiaryPage />
//   </PremiumGate>
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { usePremium } from "../context/PremiumContext";
import PricingModal from "./PricingModal";

const LOCK_ICON = (
  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
  </svg>
);

const PremiumGate = ({ children, feature = "this feature" }) => {
  const { isPremium, loading } = usePremium();
  const [showPricing, setShowPricing] = useState(false);

  // While checking status, show nothing (parent shows a spinner usually)
  if (loading) return null;

  // Fully unlocked
  if (isPremium) return <>{children}</>;

  // Locked — show blurred preview + overlay
  return (
    <>
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}

      <div style={{ position: "relative", userSelect: "none" }}>
        {/* Blurred / dimmed preview of actual content */}
        <div style={{
          filter: "blur(6px) brightness(0.6)",
          pointerEvents: "none",
          overflow: "hidden",
          maxHeight: 320,
        }}>
          {children}
        </div>

        {/* Lock overlay */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "rgba(15,23,42,0.55)",
          backdropFilter: "blur(2px)",
          borderRadius: 16, zIndex: 10,
          padding: 24, textAlign: "center",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", marginBottom: 16,
          }}>
            {LOCK_ICON}
          </div>

          <h3 style={{
            color: "#fff", fontSize: 20, fontWeight: 800,
            marginBottom: 8, letterSpacing: "-0.5px",
          }}>
            Premium Feature
          </h3>

          <p style={{
            color: "#c7d2fe", fontSize: 14, marginBottom: 20,
            maxWidth: 280, lineHeight: 1.6,
          }}>
            Upgrade to Premium to unlock <strong style={{ color: "#fff" }}>{feature}</strong> and all other premium features.
          </p>

          <button
            onClick={() => setShowPricing(true)}
            style={{
              padding: "11px 28px",
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff", border: "none", borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 4px 20px rgba(99,102,241,.5)",
              transition: "opacity .15s, transform .15s",
            }}
            onMouseOver={e => { e.currentTarget.style.opacity = ".88"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseOut={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = ""; }}
          >
            💎 Upgrade to Premium
          </button>

          <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 12 }}>
            Starting at ₹99/month · Cancel anytime
          </p>
        </div>
      </div>
    </>
  );
};

export default PremiumGate;
