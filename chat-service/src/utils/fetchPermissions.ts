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

      await redisClient.sadd(`permittedChats${userId}`, ...permittedChats);

      for (const chat of chats) {
        await redisClient.sadd(
          `permissions${chat._id}`,
          ...chat.participants.map((user) => userId.toString())
        ); 
      }
    } catch (error) {
      logger.error(`an error occured fetching permissions ${error}`);
    }
  }
};

export const invalidatePermissions = async (userId: Types.ObjectId) => {
  try {
    await redisClient.del(`permittedChats${userId}`);
    logger.info("user permissions deleted successfully");
  } catch (error) {
    logger.error(`An error occured invalidating permissions ${error}`);
  }
};
