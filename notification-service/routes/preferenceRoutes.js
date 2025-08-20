const express = require('express');
const UserPreference = require('../models/UserPreference');
const router = express.Router();

// Update preferences
router.put('/:userId', async (req, res) => {
  try {
    const updated = await UserPreference.findOneAndUpdate(
      { userId: req.params.userId },
      { preferences: req.body.preferences },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get preferences
router.get('/:userId', async (req, res) => {
  try {
    const prefs = await UserPreference.findOne({ userId: req.params.userId });
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
