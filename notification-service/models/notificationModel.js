import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    receiverId: {
      type: String,
      ref: "User",
      required: true, // recipient must exist
    },
    receiverName: {
      type: String,
      required: true
    },
    senderId: {
      type: String,
      ref: "User",
      default: null, // system notifications may not have a sender
    },
    senderName: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["comment", "like", "follow", "system"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: String,
      required: false,
    },
    entityType: {
      type: String,
      enum: ["post", "comment", "user", "system"],
      required: false,
    },
    channels: {
      type: [String],
      enum: ["in-app", "push", "email"],
      default: ["in-app"],
    },
    status: {
      type: String,
      enum: ["unread", "read", "archived"],
      default: "unread",
    },
  },
  {
    timestamps: true, // automatically adds createdAt & updatedAt
  }
);

export default mongoose.model("Notification", notificationSchema);


