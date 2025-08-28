// models/UserPreference.js
const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  preferences: {
    post: { type: Boolean, default: true },
    comment: { type: Boolean, default: true },
    like: { type: Boolean, default: true },
    system: { type: Boolean, default: true }
  }
});

module.exports = mongoose.model('UserPreference', preferenceSchema);

// import mongoose from "mongoose";

// const notificationSchema = new mongoose.Schema(
//   {
//     receiverId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     receiverName: { type: String, required: true },

//     senderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },
//     senderName: { type: String },

//     type: {
//       type: String,
//       enum: ["comment", "like", "follow", "mention", "system"],
//       required: true,
//     },

//     message: { type: String, required: true, trim: true },

//     entityId: { type: mongoose.Schema.Types.ObjectId },
//     entityType: {
//       type: String,
//       enum: ["post", "comment", "user", "system"],
//     },

//     channels: {
//       type: [String],
//       enum: ["in-app", "push", "email"],
//       default: ["in-app"],
//     },

//     status: {
//       type: String,
//       enum: ["unread", "read", "archived"],
//       default: "unread",
//     },

//     isSeen: { type: Boolean, default: false },
//     count: { type: Number, default: 1 },

//     metadata: { type: mongoose.Schema.Types.Mixed },

//     priority: {
//       type: String,
//       enum: ["low", "normal", "high"],
//       default: "normal",
//     },

//     expiresAt: { type: Date, default: null },
//   },
//   { timestamps: true }
// );

// notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

// export default mongoose.model("Notification", notificationSchema);
