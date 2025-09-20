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
