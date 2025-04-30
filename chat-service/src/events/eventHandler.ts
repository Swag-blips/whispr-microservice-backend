import mongoose from "mongoose";
import Chat from "../models/chat.model";
import { ChatCreatedEvent, ChatDeletedEvent } from "../types/type";
import logger from "../utils/logger";

export const handleCreateChat = async (content: ChatCreatedEvent) => {
  logger.info("handle creat chat event");
  try {
    const { participants } = content;

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
export const handleDeleteFriends = async (content: ChatDeletedEvent) => {};
