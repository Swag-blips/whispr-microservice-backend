import mongoose, { Types } from "mongoose";
import logger from "./logger";
import Chat from "../models/chat.model";
import redisClient from "../config/redis";

export const fetchPermissions = async (userId: Types.ObjectId) => {
  if (mongoose.Types.ObjectId.isValid(userId)) {
    try {
      const chats = await Chat.find({
        participants: userId,
      });

      if (chats.length <= 0) {
        return;
      }

      const permittedChats = chats.map((chat) => chat._id.toString());

      await redisClient.sadd(`permittedChats${userId}`, permittedChats);

      for (const chat of chats) {
        await redisClient.sadd(`participants${chat._id}`, chat._id.toString());
      }

      logger.info(chats);
    } catch (error) {
      logger.error(error);
    }
  }
};
