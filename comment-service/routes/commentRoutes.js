import express from 'express';
import {
  addComment,
  deleteComment,
  dislikeComment,
  getCommentsById,
  getCommentsByPost,
  getReplies,
  likeComment,
  updateComment
} from '../controllers/commentController.js';

const router = express.Router();

router.post('/add', addComment);
router.get('/replies', getReplies);
router.post('/like', likeComment);
router.post("/dislike", dislikeComment);
router.post('/update', updateComment);
router.get('/:commentId', getCommentsById);
router.get('/all/:postId', getCommentsByPost);
router.delete('/delete/:commentId', deleteComment);


export default router;
