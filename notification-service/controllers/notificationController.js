import notificationModel from "../models/notificationModel.js";

// @desc Get all notifications for a user
// @route GET /api/notifications/:userId
// @access Private (depends on your auth)
export const getNotifications = async (req, res) => {
  try {
    // { recieverId: req.params.userId }
    console.log('notification backend')
    const notifications = await notificationModel.find({ })
      .sort({ createdAt: -1 });
    const unReadCount  = await notificationModel.countDocuments({status: "unread"})
    res.send({notifications, unReadCount});

    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc Mark a notification as read
// @route PUT /api/notifications/:id/read
// @access Private
export const markNotificationAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { status: "read" });
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
