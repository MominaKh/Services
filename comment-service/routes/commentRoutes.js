import express from 'express';
import {
  addComment,
  deleteComment,
  getCommentsByPost,
  getReplies,
  likeComment,
  updateComment
} from '../controllers/commentController.js';

const router = express.Router();

router.post('/add', addComment);
router.get('/replies', getReplies);
router.post('/like', likeComment);
router.post('/update', updateComment);
router.get('/:postId', getCommentsByPost);
router.delete('/delete/:commentId', deleteComment);


export default router;
