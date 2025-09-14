// models/preferencesModel.js
import mongoose from "mongoose";

const channelSchema = new mongoose.Schema({
  inApp:  { type: Boolean, default: true },   // always ON
  push:   { type: Boolean, default: false },
  email:  { type: Boolean, default: false }
}, { _id: false });

const perTypeSchema = new mongoose.Schema({
  like:    { type: channelSchema, default: () => ({}) },
  reply:   { type: channelSchema, default: () => ({}) },
  mention: { type: channelSchema, default: () => ({ push: true }) }, // push ON by default

  // 🔒 system updates (locked)
  system: {
    inApp: { type: Boolean, default: false, immutable: true },
    push:  { type: Boolean, default: false, immutable: true },
    email: { type: Boolean, default: true, immutable: true }
  },

  // 🔒 security alerts (locked)
  security: {
    inApp: { type: Boolean, default: false, immutable: true },
    push:  { type: Boolean, default: false, immutable: true },
    email: { type: Boolean, default: true, immutable: true }
  }
}, { _id: false });

const preferenceSchema = new mongoose.Schema({
  userId: { type: String, ref: "User", required: true, unique: true },

  global: {
    inApp:  { type: Boolean, default: true, immutable: true }, // cannot disable in-app globally
    push:   { type: Boolean, default: false },
    email:  { type: Boolean, default: false }
  },

  perType: { type: perTypeSchema, default: () => ({}) }
}, { timestamps: true });

export default mongoose.model("Preference", preferenceSchema);


// // subscriber.js
// import { io } from "socket.io-client";
// import { createRedisClients } from "../shared-config/redisClient.js";
// import notificationModel from "./models/notificationModel.js";
// import Preference from "./models/preferencesModel.js";

// // 1. Await redis clients
// const { sub } = await createRedisClients();

// // 2. Connect socket.io client (gateway server on :4000)
// const socket = io("http://localhost:4000");

// // 3. Subscribe to notifications
// await sub.subscribe("notification:event", async (message) => {
//   try {
//     const payload = JSON.parse(message);

//     const { receiverId, type, data } = payload;

//     // 🔍 Fetch user preferences (assumes doc exists because we seeded at signup)
//     const pref = await Preference.findOne({ userId: receiverId });

//     if (!pref) {
//       console.error(`❌ Preference not found for user ${receiverId} (unexpected)`);
//       return;
//     }

//     // 4. Check global & perType
//     const global = pref.global;
//     const perType = pref.perType[type];

//     // Global in-app is always true (enterprise mode) → guaranteed in-app record
//     if (global.inApp && perType?.inApp) {
//       await notificationModel.create({
//         receiverId,
//         type,
//         content: data.content,
//         meta: data.meta,
//       });
//     }

//     // Push notification
//     if (global.push && perType?.push) {
//       socket.emit("send:push", { receiverId, type, data });
//     }

//     // Email notification
//     if (global.email && perType?.email) {
//       socket.emit("send:email", { receiverId, type, data });
//     }

//   } catch (err) {
//     console.error("Error processing notification:", err);
//   }
// });


// controllers/authController.js
// import User from "../models/userModel.js";
// import Preference from "../models/preferencesModel.js";

// export const signup = async (req, res) => {
//   try {
//     const { name, email, password } = req.body;

//     // 1. Create user
//     const user = await User.create({ name, email, password });

//     // 2. Seed preferences with enterprise defaults
//     await Preference.create({
//       userId: user._id,
//       global: { inApp: true, push: false, email: false }, // global switches
//       perType: {
//         like: { inApp: true, push: false, email: false },
//         reply: { inApp: true, push: false, email: false },
//         mention: { inApp: true, push: true, email: false },
//         // system + security will use schema defaults
//       }
//     });

//     res.status(201).json({ message: "User registered successfully", user });
//   } catch (error) {
//     console.error("Signup failed:", error);
//     res.status(500).json({ error: "Signup failed" });
//   }
// };
