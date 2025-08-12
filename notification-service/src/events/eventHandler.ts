import { clients } from "../controller/notification.controller";
import Notification from "../models/notification.model";
import User from "../models/user.model";
import { NotificationInterface as NotificationEvent } from "../types/type";
import logger from "../utils/logger";

export const handleFriendRequestNotification = async (
  event: NotificationEvent
) => {
  try {
    await Notification.create({
      from: event.from,
      to: event.to,
      type: "Pending",
      read: false,
    });

    const client = clients.get(event.to);
    console.log(clients.keys());
    console.log("event", event);

    if (client) {
      const sender = await User.findById(event.from).lean();

      client.write(
        `data: ${JSON.stringify({
          type: "sendFriendRequest",
          sender,
        })}\n\n`
      );
    }
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

    const client = clients.get(event.from);

    if (client) {
      const sender = await User.findById(event.to).lean();
      client.write(
        `data: ${JSON.stringify({
          type: "acceptFriendRequest",
          sender,
        })}\n\n`
      );
    }
    return;
  } catch (error) {
    logger.error(error);
  }
};
