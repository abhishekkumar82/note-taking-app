const { Schema, model } = require("mongoose");

const ReviewSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one review per user; update via PUT
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// Fast public feed: Pro users first, then by newest
ReviewSchema.index({ createdAt: -1 });

module.exports = model("Review", ReviewSchema);
