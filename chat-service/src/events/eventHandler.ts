import mongoose from "mongoose";
import Chat from "../models/chat.model";
import { ChatCreatedEvent, ChatDeletedEvent } from "../types/type";
import logger from "../utils/logger";
import { connection } from "../config/dbConnect";
import Message from "../models/message.model";
import redisClient from "../config/redis";

export const handleCreateChat = async (content: ChatCreatedEvent) => {
  logger.info("handle create chat event");
  try {
    const { participants } = content;

    await redisClient.del(`userChats${participants[0]}`);
    await redisClient.del(`userChats${participants[1]}`);

    await Chat.create({
      participants,
      type: "private",
    });
    logger.info("Chat created successfully");
  } catch (error) {
    logger.error("error creating a chat", error);
  }
}; 

let session: mongoose.mongo.ClientSession | undefined;
export const handleDeleteFriends = async (content: ChatDeletedEvent) => {
  try {
    const { user1, user2 } = content;
    session = await connection?.startSession();

    await session?.withTransaction(async () => {
      await Chat.findOneAndDelete(
        {
          $or: [
            { participants: [user1, user2] },
            { participants: [user2, user1] },
          ],
        },
        { session }
      );

      await Message.deleteMany(
        {
          $or: [
            { senderId: user1, receiverId: user2 },
            { senderId: user2, receiverId: user1 },
          ],
        },
        { session }
      );
    });
    logger.info("Chats and messages deleted");
  } catch (error) {
    logger.error(error);
  } finally {
    await session?.endSession();
  }
};
