// src/components/Logo.jsx
// ─────────────────────────────────────────────────────────────────────────────
// WriteUp brand logo system — "The Daily Arc" mark
//
//  Three elements tell the full story:
//    • Ring dot  — a fresh blank page; every daily journey starts here
//    • 270° arc  — the continuous cycle of writing & organising daily life
//    • Checkmark — accomplishment; the "Up" in WriteUp, life going forward
//
//  <LogoMark size={40} />         — icon only
//  <LogoFull size={40} />         — icon + wordmark side by side
//  <LogoWordmark size="1.4rem" /> — wordmark text only (no icon)
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";

// ── Icon mark ─────────────────────────────────────────────────────────────────
export const LogoMark = ({ size = 40, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 44 44"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="WriteUp — write daily, achieve daily"
  >
    <defs>
      <linearGradient id="wu-bg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stopColor="#4f46e5" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>

      <radialGradient id="wu-shine" cx="0.22" cy="0.15" r="0.65" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stopColor="#fff" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0"    />
      </radialGradient>

      <filter id="wu-shadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#4f46e5" floodOpacity="0.38" />
      </filter>

      <clipPath id="wu-clip">
        <rect width="44" height="44" rx="12" />
      </clipPath>
    </defs>

    {/* Shadow layer */}
    <rect width="44" height="44" rx="12" fill="url(#wu-bg)" filter="url(#wu-shadow)" />

    {/* Background */}
    <rect width="44" height="44" rx="12" fill="url(#wu-bg)" />

    {/* Shine overlay */}
    <rect width="44" height="44" rx="12" fill="url(#wu-shine)" clipPath="url(#wu-clip)" />

    {/* Inner border highlight */}
    <rect x="1" y="1" width="42" height="42" rx="11"
      stroke="white" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />

    {/* ── The "Daily Arc" mark ────────────────────────────────────────────────
        Dot  (10.5, 27)  — ring shape = blank page, start of the day
        Arc  270° sweep  — the daily cycle: notes, diary, habits, reminders
        Check (→ up-right) — accomplishment; life going in the right direction
    ────────────────────────────────────────────────────────────────────────── */}

    {/* Dot — outer ring (filled white) */}
    <circle cx="10.5" cy="27" r="3.8" fill="white" />
    {/* Dot — inner void creates the "ring/nib" look */}
    <circle cx="10.5" cy="27" r="2"   fill="#5b40d0" />

    {/* 270° arc from dot (7-o'clock) clockwise through top to 3-o'clock */}
    <path
      d="M 10.5,27 A 12,12 0 1,1 33,21"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />

    {/* Checkmark — breaks free from the arc, pointing up = WriteUp direction */}
    <polyline
      points="29.5,24.5 33,21 38.5,15"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// ── Wordmark — "Write Up" with gradient "Up" ─────────────────────────────────
export const LogoWordmark = ({ size = "1.3rem", dark = false }) => (
  <span
    className="wu-wordmark"
    style={{
      fontSize:      size,
      fontFamily:    "'Unbounded','Inter',sans-serif",
      fontWeight:    800,
      letterSpacing: "-0.04em",
      lineHeight:    1,
      userSelect:    "none",
      display:       "inline-flex",
      alignItems:    "baseline",
      gap:           "0.12em",
    }}
  >
    <span style={{ color: dark ? "#f1f5f9" : "#0f172a", fontWeight: 700 }}>Write</span>
    <span
      style={{
        background:           "linear-gradient(135deg,#4f46e5,#7c3aed)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor:  "transparent",
        backgroundClip:       "text",
        fontWeight:           900,
      }}
    >
      Up
    </span>
  </span>
);

// ── Full logo — icon + wordmark ───────────────────────────────────────────────
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
