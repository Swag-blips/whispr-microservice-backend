import { Request, Response } from "express";
import logger from "../utils/logger";
import Notification from "../models/notification.model";

export const getNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const notifications = await Notification.find({
      to: userId,
    });

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
