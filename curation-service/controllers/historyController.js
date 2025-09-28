const History = require('../models/history');
const { ApiError } = require('../utils/errorHandler');

// Record a post view
const recordView = async (req, res, next) => {
  try {
    const { postId } = req.body;
    const userId = req.user.userId;

    const history = new History({
      userId,
      postId
    });

    await history.save();
    res.status(201).json({ message: 'View recorded successfully', history });
  } catch (error) {
    // If error is due to duplicate view within time window, just return success
    if (error.code === 11000) {
      return res.json({ message: 'View already recorded' });
    }
    res.status(500).json({ message: 'Error recording view', error: error.message });
  }
};

// Get user's view history
const getHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const history = await History.find({ userId })
      .sort({ viewedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await History.countDocuments({ userId });

    res.json({
      history,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching history', error: error.message });
  }
};

// Search within history
const searchHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { q } = req.query;

    const history = await History.find({
      userId,
      $or: [
        { postTitle: { $regex: q, $options: 'i' } },
        { postDescription: { $regex: q, $options: 'i' } }
      ]
    }).sort({ viewedAt: -1 });

    res.json({ history });
  } catch (error) {
    res.status(500).json({ message: 'Error searching history', error: error.message });
  }
};

// Delete specific history items
const deleteHistoryItems = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemIds } = req.body;

    await History.deleteMany({
      userId,
      _id: { $in: itemIds }
    });

    res.json({ message: 'History items deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting history items', error: error.message });
  }
};

// Clear all history
const clearHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    await History.deleteMany({ userId });
    res.json({ message: 'History cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing history', error: error.message });
  }
};

module.exports = {
  recordView,
  getHistory,
  searchHistory,
  deleteHistoryItems,
  clearHistory
};