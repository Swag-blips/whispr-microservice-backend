import { Request, Response } from "express";
import logger from "../utils/logger";
import redisClient from "../config/redis";

import Message from "../models/message.model";
import Chat from "../models/chat.model";
import { io } from "../socket/socket";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    const permittedChats = await redisClient.smembers(
      `permittedChats${userId}`
    );
    const chatParticipants = await redisClient.smembers(`permissions${chatId}`);

    if (!permittedChats.length || !chatParticipants.length) {
      const chat = await Chat.findById(chatId);

      if (!chat) {
        res.status(404).json({ success: false, message: "Chat not found" });
        return;
      }

      if (!chat.participants.includes(userId)) {
        res.status(401).json({ success: false, message: "Not permitted" });
        return;
      }

      const receiverId = chat.participants.find(
        (user) => user.toString() !== userId
      );

      await Message.create({
        chatId,
        content,
        receiverId: receiverId,
        senderId: userId,
      });

      await redisClient.sadd(`permittedChats${userId}`, chat._id.toString());
      await redisClient.sadd(
        `permissions${chatId}`,
        ...chat.participants.map((particpant) => particpant.toString())
      );

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

      const receiverId = chatParticipants.find(
        (user) => user.toString() !== userId
      );

      const message = await Message.create({
        chatId,
        content,
        receiverId,

        senderId: userId,
      });

      if (message && receiverId) {
        io.to(receiverId).emit("newMessage", message);
      }

      res
        .status(201)
        .json({ success: true, message: "Message successfully sent" });

      return;
    }
  } catch (error) {
    logger.error(`An error occured while sending message ${error}`);
    res.status(500).json({ error: error });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      res.status(400).json({ success: false, message: "Chat Id is required" });
      return;
    }

    const messages = await Message.find({
      chatId,
    });

    if (!messages.length) {
      res.status(200).json([]);
      return;
    }

    res.status(200).json({ success: true, messages });
    return;
  } catch (error) {
    logger.error(`error getting messages ${error}`);
    res.status(500).json({ error: error });
  }
};

export const createGroup = async (req: Request, res: Response) => {
  try {
    const { participants, groupName, bio } = req.body;

    const chat = await Chat.create({
      participants,
      
    });
  } catch (error) {
    logger.error(`error creating group ${error}`);
    res.status(500).json({ error: error });
  }
};
