const Notification = require("../models/Notification");
const { sendSuccess, sendError, sendPaginated } = require("../utils/response");
const { getPaginationParams } = require("../utils/helpers");

exports.getNotifications = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments({ userId: req.user._id }),
      Notification.countDocuments({ userId: req.user._id, isRead: false }),
    ]);
    return sendPaginated(res, "Notifications.", { notifications, unreadCount }, total, page, limit);
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true }
    );
    return sendSuccess(res, "Notification marked as read.");
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    return sendSuccess(res, "All notifications marked as read.");
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    return sendSuccess(res, "Notification deleted.");
  } catch (err) {
    return sendError(res, err.message);
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    return sendSuccess(res, "Unread count.", { count });
  } catch (err) {
    return sendError(res, err.message);
  }
};
