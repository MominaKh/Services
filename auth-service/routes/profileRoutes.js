import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import {
  getProfile,
  setupProfile,
  updateProfile
} from '../controllers/profileController.js';

const router = express.Router();

router.get('/:userId', getProfile);
router.post("/setup/:userId", setupProfile)
router.put('/:userId', upload.single('profileImage'), updateProfile);

export default router;
