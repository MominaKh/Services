const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  recordView,
  getHistory,
  searchHistory,
  deleteHistoryItems,
  clearHistory
} = require('../controllers/historyController');

// Protect all routes
router.use(authMiddleware);

// Record a view
router.post('/', recordView);

// Get user's history
router.get('/', getHistory);

// Search history
router.get('/search', searchHistory);

// Delete specific history items
router.delete('/items', deleteHistoryItems);

// Clear all history
router.delete('/clear', clearHistory);

module.exports = router;