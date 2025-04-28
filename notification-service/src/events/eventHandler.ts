import Notification from "../models/notification.model";
import { Notification as NotificationEvent } from "../types/type";
import logger from "../utils/logger";

export const handleFriendRequestNotification = async (
  event: NotificationEvent
) => {
  try {
    await Notification.create({
      from: event.from,
      to: event.to,
      
    });

    logger.info("Friend request notification created");
  } catch (error) {
    logger.error(error);
  }
};
