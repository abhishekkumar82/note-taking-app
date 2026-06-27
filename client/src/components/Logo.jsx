// src/components/Logo.jsx
// ─────────────────────────────────────────────────────────────────────────────
// WriteUp brand logo system.
//
//  <LogoMark size={40} />         — icon only (rounded square + W mark)
//  <LogoFull size={40} />         — icon + wordmark side by side
//  <LogoWordmark size="1.4rem" /> — wordmark text only (no icon)
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";

// ── Icon mark — gradient rounded square + geometric W ────────────────────────
export const LogoMark = ({ size = 40, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 44 44"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="WriteUp logo"
  >
    <defs>
      {/* Main background gradient */}
      <linearGradient id="wu-bg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#4f46e5" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>

      {/* Shine overlay in top-left */}
      <radialGradient id="wu-shine" cx="0.25" cy="0.18" r="0.65" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stopColor="#fff" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0"    />
      </radialGradient>

      {/* Drop shadow filter */}
      <filter id="wu-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4f46e5" floodOpacity="0.35" />
      </filter>

      {/* Clip to rounded rect */}
      <clipPath id="wu-clip">
        <rect width="44" height="44" rx="11" />
      </clipPath>
    </defs>

    {/* Shadow */}
    <rect width="44" height="44" rx="11" fill="url(#wu-bg)" filter="url(#wu-shadow)" />

    {/* Background */}
    <rect width="44" height="44" rx="11" fill="url(#wu-bg)" />

    {/* Shine */}
    <rect width="44" height="44" rx="11" fill="url(#wu-shine)" clipPath="url(#wu-clip)" />

    {/* Subtle border highlight */}
    <rect
      x="0.75" y="0.75" width="42.5" height="42.5" rx="10.5"
      stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none"
    />

    {/* ── W mark ─────────────────────────────────────────────────────────
        5 key points form the W:
          (9,32) → left foot
          (16,12) → left peak (arm going UP)
          (22,23) → center valley
          (28,12) → right peak (arm going UP)
          (35,32) → right foot
        Upper arms are taller than the center dip — emphasizes "UP".
    ──────────────────────────────────────────────────────────────────── */}
    <polyline
      points="9,32 16,12 22,23 28,12 35,32"
      stroke="white"
      strokeWidth="3.2"
      strokeLinejoin="round"
      strokeLinecap="round"
      fill="none"
    />

    {/* Subtle glow behind the W */}
    <polyline
      points="9,32 16,12 22,23 28,12 35,32"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="7"
      strokeLinejoin="round"
      strokeLinecap="round"
      fill="none"
    />

    {/* W mark on top of glow */}
    <polyline
      points="9,32 16,12 22,23 28,12 35,32"
      stroke="white"
      strokeWidth="3.2"
      strokeLinejoin="round"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

// ── Wordmark — "Write Up" with gradient "Up" ─────────────────────────────────
export const LogoWordmark = ({ size = "1.3rem", dark = false }) => (
  <span
    className="wu-wordmark"
    style={{
      fontSize:       size,
      fontFamily:     "'Unbounded','Inter',sans-serif",
      fontWeight:     800,
      letterSpacing:  "-0.04em",
      lineHeight:     1,
      userSelect:     "none",
      display:        "inline-flex",
      alignItems:     "baseline",
      gap:            "0.12em",
    }}
  >
    <span style={{ color: dark ? "#f1f5f9" : "#0f172a", fontWeight: 700 }}>Write</span>
    <span
      style={{
        background:              "linear-gradient(135deg,#4f46e5,#7c3aed)",
        WebkitBackgroundClip:    "text",
        WebkitTextFillColor:     "transparent",
        backgroundClip:          "text",
        fontWeight:              900,
      }}
    >
      Up
    </span>
  </span>
);

// ── Full logo — icon + wordmark ────────────────────────────────────────────────
export const LogoFull = ({ size = 36, dark = false, className = "" }) => (
  <div
    className={className}
    style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.27), textDecoration: "none" }}
  >
    <LogoMark size={size} />
    <LogoWordmark size={`${(size * 0.42).toFixed(1)}px`} dark={dark} />
  </div>
);

export default LogoFull;
