import { Types } from "mongoose";
import Message from "../models/message.model";

import redisClient from "../config/redis";
import { io } from "../server";
import logger from "./logger";

export const updateMessagesToDelivered = async (userId: Types.ObjectId) => {
  try {
    const messages = await Message.find({
      receiverId: userId,
      status: "sent",
    }).select("_id chatId");

    if (!messages.length) return;

    const groupedByChat: Record<string, string[]> = {};

    for (const msg of messages) {
      const chatId = msg.chatId.toString();

      if (!groupedByChat[chatId]) {
        groupedByChat[chatId] = [];
      }
      groupedByChat[chatId].push(msg._id.toString());
    }

    Object.entries(groupedByChat).forEach(([chatId, messageIds]) => {
      io.to(chatId).emit("messagesDelivered", {
        chatId,
        messageIds,
        receiverId: userId,
      });
    });

    await Message.updateMany(
      {
        receiverId: userId,
        status: "sent",
      },
      {
        $set: { status: "delivered" },
      }
    );

    logger.info("updated messages to delivered")  
    return;
  } catch (error) {
    console.error("Failed to update messages to delivered:", error);
  }
};

export const markMessagesAsSeen = async (chatId: string, userId: string) => {
  try {
    const messages = await Message.updateMany(
      {
        chatId: chatId,
        receiverId: userId,
        status: { $ne: "seen" },
      },
      {
        $set: { status: "seen" },
      }
    );

    io.to(chatId).emit("messagesSeen", { receiverId: userId, chatId });
    await redisClient.del(`userChats:${userId}`);
    await redisClient.del(`messages:${chatId}`);
    return;
  } catch (error) {
    console.error(error);
  }
};
