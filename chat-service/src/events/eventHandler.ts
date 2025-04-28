import Chat from "../models/chat.model";
import { ChatCreatedEvent } from "../types/type";
import logger from "../utils/logger";

export const handleCreateChat = async (content: ChatCreatedEvent) => {
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
