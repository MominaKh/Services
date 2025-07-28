import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import {
  getProfile,
  updateProfile
} from '../controllers/profileController.js';

const router = express.Router();

router.get('/:userId', getProfile);
router.put('/:userId', upload.single('profileImage'), updateProfile);

export default router;
