// server/routes/payment.js
// ─────────────────────────────────────────────────────────────────────────────
// Razorpay subscription payment routes
// POST /api/payment/create-order   → create Razorpay order
// POST /api/payment/verify         → verify signature & activate premium
// GET  /api/payment/status         → check current user's premium status
// ─────────────────────────────────────────────────────────────────────────────

const express  = require("express");
const router   = express.Router();
const Razorpay = require("razorpay");
const crypto   = require("crypto");
const { isLoggedIn } = require("../middleware/checkAuth");
const User     = require("../models/User");

// ── Razorpay instance ──────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Subscription plans — prices come from env vars so you can change anytime ──
// Razorpay amounts are in PAISE (1 INR = 100 paise).
// Set on Render: PRICE_MONTHLY_INR=99  PRICE_YEARLY_INR=799
const MONTHLY_INR = parseInt(process.env.PRICE_MONTHLY_INR || "99");
const YEARLY_INR  = parseInt(process.env.PRICE_YEARLY_INR  || "799");

const PLANS = {
  monthly: { amount: MONTHLY_INR * 100, label: "Monthly", days: 30  },
  yearly:  { amount: YEARLY_INR  * 100, label: "Yearly",  days: 365 },
};

// ── POST /api/payment/create-order ────────────────────────────────────────
router.post("/create-order", isLoggedIn, async (req, res) => {
  try {
    const { plan = "monthly" } = req.body;
    const selectedPlan = PLANS[plan];
    if (!selectedPlan) return res.status(400).json({ message: "Invalid plan" });

  const order = await razorpay.orders.create({
  amount: selectedPlan.amount,
  currency: "INR",
  receipt: `rcpt_${Date.now()}`, // ✅ fixed

});

    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      plan,
      key:      process.env.RAZORPAY_KEY_ID,
      userName: req.user.displayName,
      userEmail: req.user.email || "test@example.com",
    });
  } catch (err) {
    console.error("FULL ERROR:", JSON.stringify(err, null, 2));
    res.status(500).json({ message: "Failed to create payment order" });
  }
});

// ── POST /api/payment/verify ───────────────────────────────────────────────
router.post("/verify", isLoggedIn, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan = "monthly" } = req.body;

    // 1. Verify signature
    const body      = razorpay_order_id + "|" + razorpay_payment_id;
    const expected  = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed. Invalid signature." });
    }

    // 2. Calculate expiry
    const days   = PLANS[plan]?.days || 30;
    const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // 3. Update user
    await User.findByIdAndUpdate(req.user._id, {
      isPremium:           true,
      premiumPlan:         plan,
      premiumSince:        new Date(),
      premiumExpiresAt:    expiry,
      lastPaymentId:       razorpay_payment_id,
      lastOrderId:         razorpay_order_id,
    });

    res.json({
      success: true,
      message: "Payment verified. Welcome to Premium! 🎉",
      isPremium: true,
      premiumPlan: plan,
      premiumExpiresAt: expiry,
    });
  } catch (err) {
    console.error("Payment verify error:", err);
    res.status(500).json({ message: "Verification error" });
  }
});

// ── GET /api/payment/status ────────────────────────────────────────────────
router.get("/status", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "isPremium premiumPlan premiumSince premiumExpiresAt trialEndsAt"
    );

    // Auto-expire paid subscription
    if (user.isPremium && user.premiumExpiresAt && new Date() > user.premiumExpiresAt) {
      await User.findByIdAndUpdate(req.user._id, { isPremium: false });
      return res.json({ isPremium: false, expired: true, isTrial: false });
    }

    // Trial status
    const now      = new Date();
    const isTrial  = !user.isPremium && user.trialEndsAt && now < new Date(user.trialEndsAt);
    const trialEndsAt = user.trialEndsAt || null;

    res.json({
      isPremium:        user.isPremium || false,
      premiumPlan:      user.premiumPlan || null,
      premiumSince:     user.premiumSince || null,
      premiumExpiresAt: user.premiumExpiresAt || null,
      isTrial,
      trialEndsAt,
    });
  } catch {
    res.status(500).json({ message: "Status check failed" });
  }
});

module.exports = router;

