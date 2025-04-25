import Notification from "../src/model/notification.model";
import { Notification as NotificationEvent } from "../src/types/type";
import logger from "../src/utils/logger";

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
