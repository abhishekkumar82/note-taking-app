const mongoose = require("mongoose");

const HabitLogSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.ObjectId, ref: "User", required: true },
  habitId: { type: String, required: true },
  date:    { type: String, required: true },   // "YYYY-MM-DD"
  status:  { type: String, enum: ["completed", "missed"], required: true },
});

// Compound index so each habit has at most one log per day per user
HabitLogSchema.index({ habitId: 1, date: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("HabitLog", HabitLogSchema);
