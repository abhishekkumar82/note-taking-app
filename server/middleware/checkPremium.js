// server/middleware/checkPremium.js
// ─────────────────────────────────────────────────────────────────────────────
// Guards premium-only routes.
// Use AFTER isLoggedIn:
//   router.use(isLoggedIn, checkPremium);
// ─────────────────────────────────────────────────────────────────────────────

const User = require("../models/User");

exports.checkPremium = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("isPremium premiumExpiresAt");
    if (!user) return res.status(401).json({ message: "User not found" });

    // Check expiry
    if (user.isPremium && user.premiumExpiresAt && new Date() > user.premiumExpiresAt) {
      await User.findByIdAndUpdate(req.user._id, { isPremium: false });
      return res.status(403).json({
        message: "Your premium subscription has expired.",
        code: "PREMIUM_EXPIRED",
      });
    }

    if (!user.isPremium) {
      return res.status(403).json({
        message: "This feature requires a premium subscription.",
        code: "PREMIUM_REQUIRED",
      });
    }

    next();
  } catch {
    res.status(500).json({ message: "Premium check failed" });
  }
};

