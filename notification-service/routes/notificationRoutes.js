import express from "express";
import {
  deleteNotification,
  getNotifications,
  markNotificationAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

// Routes
router.get("/:userId", getNotifications);
router.delete("/delete/:notificationId", deleteNotification);
router.put("/:userId/read", markNotificationAsRead);

export default router;
