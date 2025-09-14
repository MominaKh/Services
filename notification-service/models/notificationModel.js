// models/notificationModel.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    receiverId: { type: String, ref: "User", required: true },
    receiverName: { type: String },
    senderId: { type: String, ref: "User", default: null },
    senderName: { type: String },

    triggerType: {
      type: String,
      enum: ["comment", "reply", "like", "dislike", "aggregate", "system", "security"],
      
    },
    triggerId: { type: String }, 

    message: { type: String, required: true, trim: true },

    // --- Main references ---
    postId: { type: String, ref: "Post" }, // always keep root postId
    entityId: { type: String },            // main target (commentId, profileId…)
    entityType: { 
      type: String, 
      enum: ["post", "comment", "user", "system", "security"] 
    },

    // --- Delivery & status ---
    channels: { 
      type: [String], 
      enum: ["in-app", "push", "email", "security"], 
      default: ["in-app"] 
    },
    status: { 
      type: String, 
      enum: ["unread", "read", "archived"], 
      default: "unread" 
    }, 

    // --- Aggregation & stale handling ---
    groupKey: { type: String, index: true, default: null },
    meta: {
      count: { type: Number, default: 1 },
      lastActors: { type: [String], default: [] },
      threshold: { type: Number, default: 2 }
    },
    isStale: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
