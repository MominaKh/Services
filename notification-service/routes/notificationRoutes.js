import express from "express";
import {
  getNotifications,
  markNotificationAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

// Routes
router.get("/:userId", getNotifications);
router.put("/:id/read", markNotificationAsRead);

export default router;
