import { Request, Response } from "express";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import Message from "../models/message.model";
import Chat from "../models/chat.model";
import { io } from "../socket/socket";
import { queue as addMessageQueue } from "../utils/addMessageWorker";
import {
  cacheMessages,
  getCachedMessages,
  invalidateChatMessagesCache,
} from "../utils/cache";
import { Types } from "mongoose";
import User from "../models/user.model";
import mongoose from "mongoose";

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

      const receiver = await redisClient.sismember(
        "onlineUsers",
        receiverId as unknown as string
      );
      const receiverCurrentChat = await redisClient.get(
        `currentChat:${receiverId}`
      );

      io.to(chatId).emit("newMessage", {
        content: content,
        senderId: userId,
        receiverId: receiverId,
        chatId: chatId,
        createdAt: new Date(),

        status:
          receiverCurrentChat === chatId
            ? "seen"
            : receiverCurrentChat !== chatId && receiver
            ? "delivered"
            : "sent",
      });

      res
        .status(201)
        .json({ success: true, message: "Message successfully sent" });

      await addMessageQueue.add(
        "add-message",
        {
          content: content,
          chatId: chatId,
          userId: userId,
          receiverId: receiverId,

          imagePath: file,
          status:
            receiverCurrentChat === chatId
              ? "seen"
              : receiverCurrentChat !== chatId && receiver
              ? "delivered"
              : "sent",
        },
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

      await invalidateChatMessagesCache(chatId);

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
        (user) => user.toString() !== userId.toString()
      );

      if (!receiverId) {
        res.status(400).json({ success: false, message: "No receivers" });
        return;
      }

      const receiver = await redisClient.sismember(
        "onlineUsers",
        receiverId as unknown as string
      );
      const receiverCurrentChat = await redisClient.get(
        `currentChat:${receiverId}`
      );

      io.to(chatId).emit("newMessage", {
        content: content,
        senderId: userId,
        receiverId: receiverId,
        chatId: chatId,
        createdAt: new Date(),

        status:
          receiverCurrentChat === chatId
            ? "seen"
            : receiverCurrentChat !== chatId && receiver
            ? "delivered"
            : "sent",
      });

      await addMessageQueue.add(
        "add-message",
        {
          content: content,
          chatId: chatId,
          userId: userId,
          receiverId: receiverId,
          imagePath: file,
          status:
            receiverCurrentChat === chatId
              ? "seen"
              : receiverCurrentChat !== chatId && receiver
              ? "delivered"
              : "sent",
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 3000 },
          removeOnComplete: true,
          removeOnFail: true,
        }
      );

      await invalidateChatMessagesCache(chatId);

      res
        .status(201)
        .json({ success: true, message: "Message successfully sent" });

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

    const cached = await getCachedMessages(chatId);
    if (cached) {
      res.status(200).json({ success: true, messages: cached });
      return;
    }

    const messages = await Message.find({ chatId }).lean();
    if (!messages.length) {
      res.status(200).json({ success: true, messages: [] });
      return;
    }

    await cacheMessages(chatId, messages);

    res.status(200).json({ success: true, messages });
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
    const userId = req.userId;

    const chat = await Chat.create({
      participants: [...participants, userId],
      groupName,
      bio: bio || "Not much yet, but this group is fireee",
      type: "group",
    });

    await redisClient.del(`userChats:${userId}`);
    const [userChats] = await Promise.all(
      participants.map((userId: Types.ObjectId) =>
        redisClient.del(`userChats:${userId}`)
      )
    );

    console.log("userchats after group creation", userChats);
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

    const alreadyExists = participants.some((participant: Types.ObjectId) =>
      chat.participants.includes(participant)
    );

    if (alreadyExists) {
      res
        .status(401)
        .json({ success: false, message: "One member already exists" });
      return;
    }

    chat.participants.push(...participants);

    await chat.save();

    await Promise.all(
      participants.map((userId: Types.ObjectId) =>
        redisClient.del(`userChats:${userId}`)
      )
    );
    await redisClient.del(`userChats:${userId}`);

    res.status(201).json({ success: true, message: "Users added to chat" });
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
        message:
          "Unauthorized access, you must be a member to remove other users",
      });
      return;
    }

    if (mongoose.Types.ObjectId.isValid(memberId)) {
      if (chat.participants.length <= 2) {
        await chat.deleteOne();
        await Message.deleteMany({ chatId: chatId });

        await Promise.all([
          redisClient.del(`permissions:${userId}`),
          redisClient.del(`permissions:${memberId}`),
          redisClient.del(`permittedChats:${chatId}`),
          chat.participants.forEach(async (participant) => {
            redisClient.del(`userChats:${participant}`);
          }),
        ]);
      } else {
        chat.participants = chat.participants.filter((participant) => {
          return !participant.equals(memberId);
        });

        await chat.save();
      }
    }

    const [userChats, permissions, permittedChats] = await Promise.all([
      redisClient.del(`userChats:${memberId}`),
      redisClient.del(`permissions:${memberId}`),
      redisClient.del(`permittedChats:${chatId}`),
    ]);

    console.log(userChats, permissions, permittedChats);
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

    await redisClient.del(`userChats:${userId}`);

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
    }).lean();

    if (!chats.length) {
      res.status(200).json({ success: true, chats: [] });
      return;
    }

    const transformedChats = await Promise.all(
      chats.map(async (chat) => {
        const otherUsers = chat.participants.filter(
          (participant) => participant.toString() !== userId.toString()
        );

        const time = chat.updatedAt;
        const transformedTime = time.getTime();

        const otherUsersDetails = await Promise.all(
          otherUsers.map(
            async (user) =>
              await User.findById(user._id).select("username avatar bio").lean()
          )
        );

        let unreadMessages: number | null = null;
        if (chat.type === "private") {
          unreadMessages = await Message.find({
            chatId: chat._id,
            receiverId: userId,
            status: { $ne: "seen" },
          }).countDocuments();
        }

        return {
          ...chat,
          updatedAt: transformedTime,
          otherUsers:
            otherUsersDetails.length > 1
              ? otherUsersDetails
              : otherUsersDetails[0],
          unreadMessages: unreadMessages,
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

export const sendGroupMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { content, file } = req.body;
    const userId = req.userId;

    console.log("GROUP MESSAGE");

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

      const receivers = chat.participants.filter(
        (user) => user.toString() !== userId
      );

      io.to(chatId).emit("newMessage", {
        content: content,
        senderId: userId,
        receivers: receivers,
        chatId: chatId,
        createdAt: new Date(),
      });

      res
        .status(201)
        .json({ success: true, message: "Message successfully sent" });

      await addMessageQueue.add(
        "add-message",
        {
          content: content,
          chatId: chatId,
          receivers: receivers,
          userId: userId,
          imagePath: file,
        },
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

      await invalidateChatMessagesCache(chatId);

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

      const receivers = chatParticipants.filter(
        (user) => user.toString() !== userId
      );
      if (!receivers.length) {
        res.status(400).json({ success: false, message: "No receivers" });
        return;
      }

      io.to(chatId).emit("newMessage", {
        content: content,
        senderId: userId,
        receivers: receivers,
        chatId: chatId,
        createdAt: new Date(),
      });

      await addMessageQueue.add(
        "add-message",
        {
          content: content,
          chatId: chatId,
          receivers: receivers,
          userId: userId,
          imagePath: file,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 3000 },
          removeOnComplete: true,
          removeOnFail: true,
        }
      );

      await invalidateChatMessagesCache(chatId);

      res
        .status(201)
        .json({ success: true, message: "Message successfully sent" });

      return;
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
};
