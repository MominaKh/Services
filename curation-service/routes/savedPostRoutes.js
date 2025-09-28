const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  savePost,
  getSavedPosts,
  searchSavedPosts,
  checkSavedStatus
} = require('../controllers/savedPostController');

// Protect all routes
router.use(authMiddleware);

// Save or unsave a post
router.post('/save', savePost);

// Get all saved posts
router.get('/', getSavedPosts);

// Search saved posts
router.get('/search', searchSavedPosts);

// Check if a post is saved
router.get('/check/:postId', checkSavedStatus);

module.exports = router;