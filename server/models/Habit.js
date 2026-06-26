const mongoose = require("mongoose");

const HabitSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.ObjectId, ref: "User", required: true },
  name:  { type: String, required: true },
  freq:  { type: String, enum: ["daily", "weekly"], default: "daily" },
  color: { type: String, default: "#3b82f6" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Habit", HabitSchema);
