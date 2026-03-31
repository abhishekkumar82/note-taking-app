// server/utils/sendSms.js
// ─────────────────────────────────────────────────────────────────────────────
// OPTIONAL — only needed when you want REAL SMS OTP delivery.
// Currently the app uses EMAIL OTP which is free and works without this file.
//
// To enable: uncomment your preferred provider in auth.js send-otp route
// and call sendOtpSms(phone, otp) instead of sendLoginOtpEmail(email, otp).
// ─────────────────────────────────────────────────────────────────────────────

const axios = require("axios");

// ─────────────────────────────────────────────────────────────────────────────
//  Option A: Fast2SMS — BEST FREE option for India (50 SMS/day free tier)
//  Sign up: https://www.fast2sms.com (no DLT for Quick SMS)
//  npm install axios  (already installed)
// ─────────────────────────────────────────────────────────────────────────────
exports.sendOtpVisFast2SMS = async (phone, otp) => {
  // Remove country code, keep 10-digit number
  const mobile = phone.replace(/^\+91/, "").replace(/\D/g, "");

  const res = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
    params: {
      authorization: process.env.FAST2SMS_KEY,
      variables_values: otp,
      route: "otp",
      numbers: mobile,
    },
    headers: { "cache-control": "no-cache" },
  });

  if (!res.data.return) {
    throw new Error(`Fast2SMS failed: ${JSON.stringify(res.data)}`);
  }
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Option B: Twilio — most reliable globally (~$15 trial credit)
//  npm install twilio
//  Trial restriction: can only SMS to VERIFIED numbers in console
//  Fix: go to twilio.com → Verified Caller IDs → add recipient's number
// ─────────────────────────────────────────────────────────────────────────────
exports.sendOtpViaTwilio = async (phone, otp) => {
  const twilio = require("twilio")(
    process.env.TWILIO_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  return await twilio.messages.create({
    body: `Your WriteUp OTP is: ${otp}. Valid for 10 minutes. Do not share.`,
    from: process.env.TWILIO_PHONE,
    to:   phone,  // must include country code e.g. +919876543210
  });
};

// ─────────────────────────────────────────────────────────────────────────────
//  Option C: 2Factor — Indian SMS, 10 OTPs/day on free trial
//  Sign up: https://2factor.in
// ─────────────────────────────────────────────────────────────────────────────
exports.sendOtpVia2Factor = async (phone, otp) => {
  const mobile = phone.replace(/^\+91/, "").replace(/\D/g, "");

  const res = await axios.get(
    `https://2factor.in/API/V1/${process.env.TWOFACTOR_KEY}/SMS/${mobile}/${otp}/OTP1`
  );

  if (res.data.Status !== "Success") {
    throw new Error(`2Factor failed: ${JSON.stringify(res.data)}`);
  }
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Unified sender — switch provider here without changing auth.js
// ─────────────────────────────────────────────────────────────────────────────
exports.sendOtpSms = async (phone, otp) => {
  const provider = process.env.SMS_PROVIDER || "fast2sms"; // "fast2sms" | "twilio" | "2factor"

  switch (provider) {
    case "twilio":   return exports.sendOtpViaTwilio(phone, otp);
    case "2factor":  return exports.sendOtpVia2Factor(phone, otp);
    default:         return exports.sendOtpVisFast2SMS(phone, otp);
  }
};
