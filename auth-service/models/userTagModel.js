// models/UserTag.js
import mongoose from "mongoose";

const userTagSchema = new mongoose.Schema(
  {
    // DO NOT ref "User" across microservices—store the foreign id as a string
    userId: { type: String, required: true, index: true },
    tagId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tag",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicates like (userId, tagId) appearing twice
userTagSchema.index({ userId: 1, tagId: 1 }, { unique: true });

export default mongoose.model("UserTag", userTagSchema);
