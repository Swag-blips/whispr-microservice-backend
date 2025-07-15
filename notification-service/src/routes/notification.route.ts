import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import {
  getNotification,
  getNotificationEvent,
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

export default router;
