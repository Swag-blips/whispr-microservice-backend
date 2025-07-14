import { Request, Response } from "express";
import logger from "../utils/logger";
import Notification from "../models/notification.model";
import User from "../models/user.model";

export const clients = new Map();
export const getNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const notifications = await Notification.find({
      to: userId,
    }).populate("from", "username avatar bio", User);

    if (!notifications.length) {
      res.status(200).json({ sucess: false, notifications: [] });
      return;
    }

    res.status(200).json({ success: true, notifications });
    return;
  } catch (error) {
    logger.error(`an error occured ${error}`);
    res.status(500).json({ error: error });
  }
};

export const getNotificationEvent = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      res.status(400).json({ success: false, message: "Missing userId" });
      return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.write("event: ping\ndata: connected\n\n");

    clients.set(userId, res);

    console.log(`User ${userId} connected`);

    req.on("close", () => {
      clients.delete(userId);
      console.log(`User ${userId} disconnected`);
    });
  } catch (error) {
    logger.error(`an error occured ${error}`);
    res.status(500).json({ error: error });
  }
};
