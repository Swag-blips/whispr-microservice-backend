import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import {
  getNotification,
  getNotificationEvent,
} from "../controller/notification.controller";

const router = express.Router();

router.get("/", authenticateRequest, getNotification);
router.get("/events", getNotificationEvent);

export default router;
