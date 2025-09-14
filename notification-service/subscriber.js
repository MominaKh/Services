// subscriber.js
import { io } from "socket.io-client";
import { createRedisClients } from "../shared-config/redisClient.js";
import notificationModel from "./models/notificationModel.js";
import Preference from "./models/preferencesModel.js";
import sendEmail from "../auth-service/helpers/sendEmail.js";
import notificationCacheModel from "./models/notificationCacheModel.js";

// 1. Await redis clients
const { sub } = await createRedisClients();

// 2. Connect socket.io client (only if gateway server is running on :4000)
const socket = io("http://localhost:4000");

// 🔹 Default preferences
const defaultPrefs = {
  global: { inApp: true, push: false, email: false },
  perType: {
    mention: { inApp: true, push: true, email: false },
    reply: { inApp: true, push: true, email: false },
    like: { inApp: true, push: false, email: false },
    system: { inApp: false, push: false, email: true },
    security: { inApp: false, push: false, email: true }
  }
};

// 3. User created cache handler
await sub.subscribe("user:created", async (message) => {
  try {
    const { payload } = JSON.parse(message);
    await notificationCacheModel.findByIdAndUpdate(
      payload._id,
      {
        name: payload.name,
        username: payload.username,
        email: payload.email,
        profileImage: payload.profileImage,
      },
      { upsert: true, new: true }
    );
    console.log("✅ User cached with _id as userId in notification");
  } catch (err) {
    console.error("❌ Error caching user:", err.message);
  }
});

// 4. Notification event handler
await sub.subscribe("notification:event", async (message) => {
  try {
    const { notificationPayload: payload } = JSON.parse(message);
    console.log("📩 Notification payload in subscriber:", payload);

     // 🔹 Handle system/security immediately → email only, no DB
    if (payload.entityType === "security" || payload.entityType === "system") {
      // const cache = await localCacheModel.findById(payload.receiverId);
      // if (cache?.email) {
      console.log('enter in email',)
      await sendEmail(payload.receiverEmail, payload.triggerType, payload.message);
      console.log(' email finished')
      // }
      return;
    }
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
    if (prefs.global.push && perType.push) allowedChannels.push("push");
    if (prefs.global.email && perType.email) allowedChannels.push("email");

    // Always ensure at least in-app exists
    if (!allowedChannels.includes("in-app")) {
      allowedChannels.push("in-app");
    }

    // 🔹 2. Grouping key (for aggregation)
    const groupKey = `${payload.triggerType}:${payload.entityType}:${payload.entityId}`;

    // 🔹 3. Check if existing notification exists
    let existing = await notificationModel.findOne({
      receiverId: payload.receiverId,
      groupKey,
      status: "unread"
    });

    if (existing) {
      // ✅ Update existing aggregated notification
      if (!existing.meta.lastActors.includes(payload.senderName)) {
        existing.meta.lastActors.push(payload.senderName);
        if (existing.meta.lastActors.length > 3) {
          existing.meta.lastActors = existing.meta.lastActors.slice(-3);
        }
      }

      existing.meta.count += 1;
      existing.channels = allowedChannels;
      existing.updatedAt = new Date();

      // 🔹 Smart message builder
      const actors = existing.meta.lastActors;
      const count = existing.meta.count;

      switch (payload.triggerType) {
        case "reply":
          existing.message =
            actors.length === 1
              ? `${actors[0]} replied ${count} time${count > 1 ? "s" : ""} to your comment`
              : `${actors.join(", ")} and others replied to your comment (${count} replies)`;
          break;

        case "comment":
          existing.message =
            actors.length === 1
              ? `${actors[0]} commented ${count} time${count > 1 ? "s" : ""} on your post`
              : `${actors.join(", ")} and others commented on your post (${count} comments)`;
          break;

        case "like":
          existing.message =
            actors.length === 1
              ? `${actors[0]} liked your post`
              : `${actors.join(", ")} and others liked your post`;
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
      // ✅ Create new notification
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
