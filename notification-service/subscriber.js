// subscriber.js
import { io } from "socket.io-client";
import { createRedisClients } from "../shared-config/redisClient.js";
import notificationModel from "./models/notificationModel.js";
import Preference from "./models/preferencesModel.js";

// 1. Await redis clients
const { sub } = await createRedisClients();

// 2. Connect socket.io client (only if gateway server is running on :4000)
const socket = io("http://localhost:4000");

// 🔹 Default preferences
const defaultPrefs = {
  global: { inApp: true, push: false, email: false },
  perType: {
    mention:  { inApp: true, push: true,  email: false },
    reply:    { inApp: true, push: true,  email: false },
    like:     { inApp: true, push: false, email: false },
    system:   { inApp: true, push: false, email: true  },
    security: { inApp: true, push: true,  email: true  }
  }
};

// 3. Subscribe
await sub.subscribe("notification:event", async (message) => {
  try {
    const { notificationPayload: payload } = JSON.parse(message);
    console.log("📩 Notification payload in subscriber:", payload);

    // 🛑 Skip self-notifications
    if (payload.receiverId === payload.senderId) return;

    // 🔹 1. Preferences
    let prefs = await Preference.findOne({ userId: payload.receiverId });
    if (!prefs) prefs = defaultPrefs;

    const perType =
      prefs.perType?.[payload.triggerType] ||
      defaultPrefs.perType[payload.triggerType] ||
      { inApp: true, push: false, email: false };

    const allowedChannels = [];
    if (prefs.global.inApp && perType.inApp) allowedChannels.push("in-app");
    if (prefs.global.push && perType.push)   allowedChannels.push("push");
    if (prefs.global.email && perType.email) allowedChannels.push("email");

    if (!allowedChannels.includes("in-app")) {
      allowedChannels.push("in-app");
    }

    // 🔹 2. Build a groupKey based on parent entity
    // replies/comments grouped by parent (post or comment)
    const groupKey = `${payload.triggerType}:${payload.entityType}:${payload.entityId}`;

    // 🔹 3. Try to find existing
    let existing = await notificationModel.findOne({
      receiverId: payload.receiverId,
      groupKey,
      status: "unread"
    });

    if (existing) {
      // ✅ Update aggregation

      // Avoid duplicate names in lastActors
      if (!existing.meta.lastActors.includes(payload.senderName)) {
        existing.meta.lastActors.push(payload.senderName);
        if (existing.meta.lastActors.length > 3) {
          existing.meta.lastActors = existing.meta.lastActors.slice(-3);
        }
      }

      existing.meta.count += 1;
      existing.channels = allowedChannels;
      existing.updatedAt = new Date();

      // 🔹 Build a smart message based on trigger type
      const actors = existing.meta.lastActors;
      const count = existing.meta.count;

      switch (payload.triggerType) {
        case "reply":
          if (actors.length === 1) {
            existing.message = `${actors[0]} replied ${count} time${count > 1 ? "s" : ""} to your comment`;
          } else {
            existing.message = `${actors.join(", ")} and others replied to your comment (${count} replies)`;
          }
          break;

        case "comment":
          if (actors.length === 1) {
            existing.message = `${actors[0]} commented ${count} time${count > 1 ? "s" : ""} on your post`;
          } else {
            existing.message = `${actors.join(", ")} and others commented on your post (${count} comments)`;
          }
          break;

        case "like":
          if (actors.length === 1) {
            existing.message = `${actors[0]} liked your post`;
          } else {
            existing.message = `${actors.join(", ")} and others liked your post`;
          }
          break;

        default:
          existing.message = `${actors.join(", ")} did ${payload.triggerType} (${count} times)`;
      }

      await existing.save();

      socket.emit("forward:event", {
        type: "notification:update",
        data: existing
      });
    } else {
      // ✅ New notification
      const notification = await notificationModel.create({
        ...payload,
        groupKey,
        channels: allowedChannels,
        meta: { count: 1, lastActors: [payload.senderName] }
      });

      socket.emit("forward:event", {
        type: "notification:new",
        data: notification
      });
    }
  } catch (err) {
    console.error("❌ Failed to handle notification", err);
  }
});
