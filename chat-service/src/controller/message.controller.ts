import { Request, Response } from "express";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import Message from "../models/message.model";
import Chat from "../models/chat.model";
import { io } from "../socket/socket";
import { queue } from "../utils/fileWorker";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { content, file } = req.body;
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

      const message = await Message.create({
        chatId,
        content,
        receiverId: receiverId,
        senderId: userId,
      });

      if (file) {
        queue.add(
          "upload-message-image",
          {
            imagePath: file,
            messageId: message._id,
          },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 3000,
            },
            removeOnComplete: true,
            removeOnFail: true,
          }
        );
      }

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

    const userId = req.userId;

    if (!chatId) {
      res.status(400).json({ success: false, message: "Chat Id is required" });
      return;
    }

    const cachedMessages = await redisClient.get(`messages:${chatId}`);

    if (cachedMessages) {
      const parsedMessages = JSON.parse(cachedMessages);
      res.status(200).json({ success: false, messages: parsedMessages });
    }

    const messages = await Message.find({
      chatId,
    }).limit(100);

    if (!messages.length) {
      res.status(200).json([]);
      return;
    }

    const expiryTime = 5 * 60;

    await redisClient.set(
      `messages:${chatId}`,
      JSON.stringify(messages),
      "EX",
      expiryTime
    );

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
      groupName,
      bio,
      type: "group",
    });

    res.status(201).json({ success: true, chat: chat });
    logger.info("Group successfully created");
    return;
  } catch (error) {
    logger.error(`error creating group ${error}`);
    res.status(500).json({ error: error });
  }
};

export const addMemberToGroup = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;

    const { participants } = req.body;

    const userId = req.userId;

    if (!chatId) {
      res.status(400).json({ success: false, message: "ChatId is required" });
      return;
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      res.status(404).json({ success: false, message: "Chat not found" });
      return;
    }

    if (!chat.participants.includes(userId)) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access, you must be a member to update details",
      });
      return;
    }

    chat.participants.push(...participants);

    await chat.save();

    res.status(201).json({ success: true, message: "User added to chat" });
    return;
  } catch (error) {
    logger.error(`error adding member ${error}`);
    res.status(500).json({ error: error });
  }
};

export const removeMemberFromGroup = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;

    const { memberId } = req.body;

    const userId = req.userId;

    if (!chatId) {
      res.status(400).json({ success: false, message: "ChatId is required" });
      return;
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      res.status(400).json({ success: false, message: "chat not found" });
      return;
    }
    if (!chat.participants.includes(userId)) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access, you must be a member to update details",
      });
      return;
    }

    chat.participants.filter((participant) => participant !== memberId);
    await chat.save();
    res.status(201).json({ success: true, message: "User removed from chat" });
    return;
  } catch (error) {
    logger.error(`error removing member from group ${error}`);
    res.status(500).json({ error: error });
  }
};

export const updateGroupDetails = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { bio, groupName } = req.body;

    const userId = req.userId;

    if (!chatId) {
      res.status(400).json({ success: false, message: "ChatId is required" });
      return;
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      res.status(404).json({ success: false, message: "chat not found" });
      return;
    }

    if (!chat.participants.includes(userId)) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access, you must be a member to update details",
      });
      return;
    }

    chat.bio = bio || chat.bio;
    chat.groupName = groupName || chat.groupName;

    await chat.save();

    res
      .status(201)
      .json({ success: true, message: "group successfully updated" });

    return;
  } catch (error) {
    logger.error(`error updating group details ${error}`);
    res.status(500).json({ error: error });
  }
};
