import { Request, Response } from "express";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import Message from "../models/message.model";
import Chat from "../models/chat.model";
import { io } from "../socket/socket";
import { queue } from "../utils/fileWorker";
import { queue as lastMessageQueue } from "../utils/lastMessageWorker";
import { cacheMessages, getCachedMessages } from "../utils/cache";
import { Types } from "mongoose";
import User from "../models/user.model";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { content, file } = req.body;
    const userId = req.userId;

    const permittedChats = await redisClient.smembers(
      `permittedChats${userId}`
    );
    const chatParticipants = await redisClient.smembers(`permissions${chatId}`);

    let participants: string[] = [];

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
        receiverId,
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
            backoff: { type: "exponential", delay: 3000 },
            removeOnComplete: true,
            removeOnFail: true,
          }
        );
      }

      lastMessageQueue.add(
        "update-last-message",
        { message: content, chatId },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 3000 },
          removeOnComplete: true,
          removeOnFail: true,
        }
      );

      await redisClient.sadd(`permittedChats${userId}`, chat._id.toString());
      await redisClient.sadd(
        `permissions${chatId}`,
        ...chat.participants.map((id) => id.toString())
      );

      // ✅ Invalidate per-user cache
      const participantIds = chat.participants.map((id) => id.toString());
      const keysToDelete = participantIds.map(
        (id) => `messages:${chatId}:${id}`
      );
      await redisClient.del(...keysToDelete);

      res
        .status(201)
        .json({ success: true, message: "Message successfully sent" });

      const receiverStringId = receiverId?.toString();
      await Promise.all([
        redisClient.del(`userChats:${userId}`),
        redisClient.del(`userChats:${receiverStringId}`),
      ]);
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

      lastMessageQueue.add(
        "update-last-message",
        { message: content, chatId },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 3000 },
          removeOnComplete: true,
          removeOnFail: true,
        }
      );

      const message = await Message.create({
        chatId,
        content,
        receiverId,
        senderId: userId,
      });

      // ✅ Invalidate per-user cache
      const participantIds = chatParticipants.map((id) => id.toString());
      const keysToDelete = participantIds.map(
        (id) => `messages:${chatId}:${id}`
      );
      await redisClient.del(...keysToDelete);

      res
        .status(201)
        .json({ success: true, message: "Message successfully sent" });

      const receiverStringId = receiverId?.toString();
      await Promise.all([
        redisClient.del(`userChats:${userId}`),
        redisClient.del(`userChats:${receiverStringId}`),
      ]);
      return;
    }
  } catch (error) {
    logger.error(`An error occurred while sending message ${error}`);
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

    const cached = await getCachedMessages(chatId, userId);
    if (cached) {
      res.status(200).json({ success: true, messages: cached });
      return;
    }

    const messages = await Message.find({ chatId }).lean().limit(100);
    if (!messages.length) {
      res.status(200).json([]);
      return;
    }

    const transformedMessages = await Promise.all(
      messages.map(async (message) => {
        const participants = [message.senderId, message.receiverId];
        const otherUserId = participants.find(
          (id) => id.toString() !== userId.toString()
        );

        const otherUserDetails = await User.findById(otherUserId)
          .select("username avatar")
          .lean();

        return { ...message, otherUserDetails };
      })
    );

    await cacheMessages(chatId, userId, transformedMessages);

    res.status(200).json({ success: true, messages: transformedMessages });
    return;
  } catch (error) {
    logger.error(`Error getting messages: ${error}`);
    res.status(500).json({ error: error });
    return;
  }
};
export const createGroup = async (req: Request, res: Response) => {
  try {
    const { participants, groupName, bio } = req.body;

    const chat = await Chat.create({
      participants,
      groupName,
      bio: bio || "Not much yet, but this group is fireee",
      type: "group",
    });

    await Promise.all(
      participants.map((userId: Types.ObjectId) =>
        redisClient.del(`userChats:${userId}`)
      )
    );

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

    await Promise.all(
      participants.map((userId: Types.ObjectId) =>
        redisClient.del(`userChats:${userId}`)
      )
    );

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
    await redisClient.del(`userChats:${memberId}`);
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

export const getUserChats = async (req: Request, res: Response) => {
  logger.info("USER CHATS ENDPOINT HIT");
  try {
    const userId = req.userId;

    const cachedUserChats = await redisClient.get(`userChats:${userId}`);

    if (cachedUserChats) {
      res
        .status(200)
        .json({ success: true, chats: JSON.parse(cachedUserChats) });
      return;
    }

    const chats = await Chat.find({
      participants: userId,
      type: "private",
    }).lean();

    if (!chats.length) {
      res.status(200).json({ success: true, chats: [] });
      return;
    }
    const transformedChats = await Promise.all(
      chats.map(async (chat) => {
        const otherUserId = chat.participants.find(
          (id) => id.toString() !== userId.toString()
        );
        const otherUser = await User.findById(otherUserId)
          .select("username avatar bio")
          .lean();

        return {
          ...chat,
          otherUser,
        };
      })
    );

    await redisClient.set(
      `userChats:${userId}`,
      JSON.stringify(transformedChats)
    );
    res.status(200).json({ success: true, chats: transformedChats });
    return;
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: error });
  }
};
