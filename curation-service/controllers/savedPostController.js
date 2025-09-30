import SavedPost from '../models/savedPost.js';

// Save or unsave a post
const savePost = async (req, res) => {
  try {
    const { postId, category, userId } = req.body;

    const existingSave = await SavedPost.findOne({ userId, postId });

    if (existingSave) {
      // If already saved and user wants to unsave
      if (!category) {
        await SavedPost.deleteOne({ _id: existingSave._id });
        return res.json({ message: 'Post unsaved successfully' });
      }
      // If already saved and user wants to change category
      existingSave.category = category;
      await existingSave.save();
      return res.json({ message: 'Post category updated successfully' });
    }

    // Create new saved post
    const savedPost = new SavedPost({
      userId,
      postId,
      category: category || 'Saved'
    });

    await savedPost.save();
    res.status(201).json({ message: 'Post saved successfully', savedPost });
  } catch (error) {
    res.status(500).json({ message: 'Error saving post', error: error.message });
  }
};

// Get all saved posts for a user
const getSavedPosts = async (req, res) => {
  try {
    const { category, userId } = req.query;

    const query = { userId };
    if (category) {
      query.category = category;
    }

    const savedPosts = await SavedPost.find(query)
      .sort({ savedAt: -1 });

    res.json(savedPosts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching saved posts', error: error.message });
  }
};

// Search within saved posts
const searchSavedPosts = async (req, res) => {
  try {
    const { searchTerm, category, userId } = req.query;

    const query = { userId };
    if (category) {
      query.category = category;
    }

    // Note: This is a basic implementation. In a real application,
    // you would typically integrate with a search service or use
    // text search capabilities of your database
    const savedPosts = await SavedPost.find(query)
      .sort({ savedAt: -1 });

    res.json(savedPosts);
  } catch (error) {
    res.status(500).json({ message: 'Error searching saved posts', error: error.message });
  }
};

// Check if a post is saved
const checkSavedStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.query;

    const savedPost = await SavedPost.findOne({ userId, postId });
    
    res.json({
      isSaved: !!savedPost,
      category: savedPost ? savedPost.category : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking saved status', error: error.message });
  }
};

export {
  savePost,
  getSavedPosts,
  searchSavedPosts,
  checkSavedStatus
};