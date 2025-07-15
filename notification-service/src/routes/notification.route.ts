import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import {
  getNotification,
  getNotificationEvent,
  getUnreadNotifications,
  markNotificationsAsRead,
} from "../controller/notification.controller";
import validateRequest from "../middleware/validateRequest";
import { notificationSchema } from "../utils/validate";

const router = express.Router();

router.get("/", authenticateRequest, getNotification);
router.get("/events", getNotificationEvent);
router.post(
  "/mark-as-read",
  validateRequest(notificationSchema),
  markNotificationsAsRead
);
router.get(
  "/unread-notifications",
  authenticateRequest,
  getUnreadNotifications 
);

export default router;
