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
