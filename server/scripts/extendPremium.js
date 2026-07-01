// One-time script: extend all active premium users' expiry by 3 days
// Run: node server/scripts/extendPremium.js

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

  const users = await User.find({ isPremium: true });
  console.log(`Found ${users.length} premium user(s)`);

  for (const user of users) {
    const oldExpiry = user.premiumExpiresAt;
    const newExpiry = oldExpiry
      ? new Date(oldExpiry.getTime() + THREE_DAYS)
      : new Date(Date.now() + THREE_DAYS);

    await User.findByIdAndUpdate(user._id, { premiumExpiresAt: newExpiry });
    console.log(`  ${user.email || user._id}: ${oldExpiry?.toISOString()} → ${newExpiry.toISOString()}`);
  }

  console.log("Done.");
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
