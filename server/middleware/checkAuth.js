// server/middleware/checkAuth.js
// ─────────────────────────────────────────────────────────────────────────────
// Supports BOTH auth methods in the correct priority order:
//   1. Session cookie  → Google OAuth users (Passport sets req.user)
//   2. JWT Bearer token → Email / Phone OTP users
// ─────────────────────────────────────────────────────────────────────────────

const jwt  = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "writeup-super-secret-key-change-in-prod";

exports.isLoggedIn = async function (req, res, next) {
  // 1️⃣  Session (Google OAuth via Passport) — set by passport.session()
  if (req.user) return next();

  // 2️⃣  JWT — check Authorization header first
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user    = await User.findById(decoded.id).select("-password");
      if (!user) return res.status(401).json({ message: "Account not found." });
      req.user = user;
      return next();
    } catch {
      return res.status(401).json({ message: "Token invalid or expired. Please log in again." });
    }
  }

  // 3️⃣  JWT — also check cookie (fallback for same-origin requests)
  const cookieToken = req.cookies?.wu_token;
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, JWT_SECRET);
      const user    = await User.findById(decoded.id).select("-password");
      if (!user) return res.status(401).json({ message: "Account not found." });
      req.user = user;
      return next();
    } catch {}
  }

  return res.status(401).json({ message: "Access denied. Please log in." });
};
