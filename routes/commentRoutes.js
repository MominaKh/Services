import express from 'express';
import {
  addComment,
  getCommentsByPost,
  getReplies
} from '../controllers/commentController.js';

const router = express.Router();

router.post('/add', addComment);
router.get('/replies', getReplies);
router.get('/:postId', getCommentsByPost);

export default router;
