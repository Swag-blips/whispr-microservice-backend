import { Request, Response } from "express";
import logger from "../utils/logger";
import Notification from "../models/notification.model";
import User from "../models/user.model";
import { Types } from "mongoose";

export const clients = new Map<string, Response[]>();
export const getNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const notifications = await Notification.find({
      $or: [
        { to: userId },
        { from: userId, type: "Accepted" },
        { from: userId, type: "Declined" },
      ],
    })
      .populate("from", "username avatar bio", User)
      .populate("to", "username avatar bio", User)
      .lean();

    if (!notifications.length) {
      res.status(200).json({ success: true, notifications: [] });
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
    const userId = req.userId;
    const userIdStr = String(userId);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.write("event: ping\ndata: connected\n\n");

    const userClients = clients.get(userIdStr) ?? [];
    userClients.push(res);
    clients.set(userIdStr, userClients);

    console.log(`User ${userIdStr} connected`);

    req.on("close", () => {
      const updated = clients.get(userIdStr)?.filter(r => r !== res) ?? [];
      if (updated.length) clients.set(userIdStr, updated);
      else clients.delete(userIdStr);
      console.log(`User ${userIdStr} disconnected`);
    });
  } catch (error) {
    logger.error(`an error occured ${error}`);
    res.status(500).json({ error: error });
  }
};

export const markNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const { notificationIds } = req.body;

    const ids = notificationIds.map((id: string) => new Types.ObjectId(id));
    await Notification.updateMany(
      {
        _id: { $in: ids },
      },
      { $set: { read: true } }
    );

    res
      .status(200)
      .json({ success: true, message: "notifications marked successfully" });
    return;
  } catch (error) {
    logger.error(error);
    res.status(500).json({
      error: error,
    });
  }
};

export const getUnreadNotifications = async (req: Request, res: Response) => {
  const userId = req.userId;
  try {
    const notifications = await Notification.countDocuments({
      to: userId,
      read: false,
    });

    res.status(200).json({ success: true, notifications });
    return;
  } catch (error) {
    logger.error(error); 
    res.status(500).json({
      error: error,
    });
  }
};
