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
      type: "Pending",
    });

    logger.info("Friend request notification created");
  } catch (error) {
    logger.error(error);
  }
};

export const handleFriendRequestDecline = async (event: NotificationEvent) => {
  try {
    const notification = await Notification.findOne({
      from: event.from,
      to: event.to,
    });

    if (!notification) {
      return;
    }

    notification.type = "Declined";
    await notification.save();
    return;
  } catch (error) {
    logger.error(error);
  }
};

export const handleFriendRequestAccept = async (event: NotificationEvent) => {
  console.log("EVENT", event);
  try {
    const notification = await Notification.findOne({
      from: event.from,
      to: event.to,
    });  

    console.log("NOTIFICATION", notification);
 
    if (!notification) {
      return;
    }

    notification.type = "Accepted";
    await notification.save();
    return;
  } catch (error) {
    logger.error(error);
  }
};
