// server/middleware/checkPremium.js
// ─────────────────────────────────────────────────────────────────────────────
// Guards premium-only routes.
// Use AFTER isLoggedIn:
//   router.use(isLoggedIn, checkPremium);
// ─────────────────────────────────────────────────────────────────────────────

const User = require("../models/User");

exports.checkPremium = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("isPremium premiumExpiresAt trialEndsAt");
    if (!user) return res.status(401).json({ message: "User not found" });

    const now = new Date();

    // Paid subscription expired → revoke
    if (user.isPremium && user.premiumExpiresAt && now > user.premiumExpiresAt) {
      await User.findByIdAndUpdate(req.user._id, { isPremium: false });
      return res.status(403).json({
        message: "Your premium subscription has expired.",
        code: "PREMIUM_EXPIRED",
      });
    }

    // Active paid subscription
    if (user.isPremium) return next();

    // Active free trial
    if (user.trialEndsAt && now < new Date(user.trialEndsAt)) return next();

    return res.status(403).json({
      message: "This feature requires a premium subscription.",
      code: "PREMIUM_REQUIRED",
    });
  } catch {
    res.status(500).json({ message: "Premium check failed" });
  }
};

