import { Request, Response } from "express";
import logger from "../utils/logger";
import redisClient from "../config/redis";

import Message from "../models/message.model";
import Chat from "../models/chat.model";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    const permittedChats = await redisClient.smembers(
      `permittedChats${userId}`
    );
    const chatParticipants = await redisClient.smembers(`permissions${chatId}`);

    if (!permittedChats || !chatParticipants) {
      const chat = await Chat.findById(chatId);

      if (!chat) {
        res.status(404).json({ success: false, message: "Chat not found" });
        return;
      }

      if (!chat.participants.includes(userId)) {
        res.status(401).json({ success: false, message: "Not permitted" });
        return;
      }

      await Message.create({
        chatId,
        content,
        receiverId: chatParticipants.find((user) => user !== userId),
        senderId: userId,
      });

      res
        .status(201)
        .json({ success: false, message: "Message successfully sent" });

      // TODO brodcast message to room(chatId) or to user specifcally
      return;
    } else {
      if (!permittedChats.includes(chatId.toString())) {
        res.status(401).json({ success: false, message: "Not permitted" });
        return;
      }

      if (!chatParticipants.includes(userId)) {
        res.status(401).json({ success: false, message: "Not permitted" });
        return;
      }

      await Message.create({
        chatId,
        content,
        receiverId: chatParticipants.find((user) => user !== userId),
        senderId: userId,
      });

      res
        .status(201)
        .json({ success: false, message: "Message successfully sent" });

      // TODO brodcast message to room(chatId) or to user specifcally

      return;
    }
  } catch (error) {
    logger.error(`An error occured while sending message ${error}`);
    res.status(500).json({ error: error });
  }
};
