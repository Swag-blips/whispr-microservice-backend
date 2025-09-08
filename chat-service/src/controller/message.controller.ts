import { Request, Response } from "express";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import Message from "../models/message.model";
import Chat from "../models/chat.model";
import { queue as addMessageQueue } from "../utils/addMessageWorker";
import {
  cacheMessages,
  getCachedMessages,
  invalidateChatMessagesCache,
} from "../utils/cache";
import { Types } from "mongoose";
import User from "../models/user.model";
import mongoose from "mongoose";
import { io } from "../server";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { content, file, tempId, fileType, fileName, fileSize } = req.body;
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
        _id: tempId,
        content: content,
        senderId: userId,
        tempId: tempId,
        receiverId: receiverId,
        ...(file && { file }),
        ...(fileType && { fileType }),
        chatId: chatId,
        createdAt: new Date(),
        messageType: "text",
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
          fileType: fileType,
          fileName: fileName,
          fileSize: fileSize,
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
        _id: tempId,
        content: content,
        senderId: userId,
        tempId: tempId,
        ...(file && { file }),
        ...(fileType && { fileType }),
        receiverId: receiverId,
        chatId: chatId,
        createdAt: new Date(),
        messageType: "text",
        status:
          receiverCurrentChat === chatId
            ? "seen"
            : receiverCurrentChat !== chatId && receiver
            ? "delivered"
            : "sent",
      });

      if (receiverCurrentChat !== chatId && receiver) {
        io.to(receiverId).emit("addToChats", {
          chatId,
          content,
        });
      }

      await addMessageQueue.add(
        "add-message",
        {
          content: content,
          chatId: chatId,
          userId: userId,
          receiverId: receiverId,
          imagePath: file,
          fileType,
          fileName,
          fileSize,
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
      adminId: userId,
      participants: [...participants, userId],
      groupName,
      bio: bio || "Not much yet, but this group is fireee",
      type: "group",
    });

    await redisClient.del(`userChats:${userId}`);

    await redisClient.sadd(`permissions${chat._id.toString()}`, userId);

    await redisClient.sadd(`permittedChats${userId}`, chat._id.toString());
    await Promise.all(
      participants.map(async (userId: Types.ObjectId) => {
        Promise.all([
          redisClient.del(`userChats:${userId}`),
          redisClient.sadd(`permittedChats${userId}`, chat._id.toString()),
        ]);
      })
    );

    await redisClient.sadd(
      `permissions${chat._id.toString()}`,
      ...participants
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

    if (chat.adminId?.toString() !== userId.toString()) {
      res.status(401).json({
        success: false,
        message: "Youre not authorized to add a user",
      });

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
    await redisClient.sadd(`permissions${chatId}`, ...participants);

    participants.forEach(async (participant: string) => {
      await redisClient.sadd(`permittedChats${participant}`, chatId);
    });

    participants.forEach(async (participant: string) => {
      const participantDetailsString = await redisClient.get(
        `user:${participant}`
      );
      let participantDetails;
      if (participantDetailsString) {
        participantDetails = JSON.parse(participantDetailsString);
      } else {
        participantDetails = await User.findById(participant);
      }

      const message = await Message.create({
        chatId,
        messageType: "system",
        content: `admin added ${participantDetails.username}`,
        systemAction: "user_added",
        meta: {
          actorId: userId,
          memberId: participant,
          memberAvatar: participantDetails.avatar,
        },
      });
      io.to(chatId).emit("memberAdded", {
        messageId: message._id,
        createdAt: new Date(),
        chatId,
        messageType: "system",
        content: `admin added ${participantDetails.username}`,
        systemAction: "user_added",

        meta: {
          actorId: userId,
          memberId: participant,
          memberAvatar: participantDetails.avatar,
        },
      });
    });

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
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      res.status(400).json({ success: false, message: "invalid ID" });
      return;
    }
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

    if (!chat.participants.includes(memberId)) {
      res
        .status(400)
        .json({ success: false, message: "User is not a member of the chat" });

      return;
    }

    if (chat.adminId?.toString() !== userId.toString()) {
      res.status(401).json({
        success: false,
        message: "Youre not authorized to remove a user",
      });

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

    if (chat.participants.length <= 2) {
      await chat.deleteOne();
      await Message.deleteMany({ chatId: chatId });

      await Promise.all([
        redisClient.srem(`permissions${chatId}`, memberId),

        redisClient.srem(`permittedChats${memberId}`, chatId),
        chat.participants.forEach(async (participant) => {
          redisClient.del(`userChats:${participant}`);
        }),
      ]);
    } else {
      chat.participants = chat.participants.filter((participant) => {
        return !participant.equals(memberId);
      });

      await chat.save();

      await Promise.all([
        redisClient.srem(`permissions${chatId}`, memberId),
        redisClient.del(`userChats${memberId}`),
        redisClient.srem(`permittedChats${memberId}`, chatId),
      ]);
    }

    let memberDetails;
    let member;

    memberDetails = await redisClient.get(`user:${memberId}`);

    if (!memberDetails) {
      member = await User.findById(memberId);
    } else {
      member = JSON.parse(memberDetails);
    }

    const message = await Message.create({
      senderId: userId,
      chatId,
      content: `admin removed ${member.username}`,
      systemAction: "user_removed",
      messageType: "system",
      meta: {
        actorId: userId,
        memberId,
        memberAvatar: member.avatar,
      },
    });
    io.to(chatId).emit("memberRemoved", {
      messageId: message._id,
      createdAt: new Date(),
      chatId,
      messageType: "system",
      content: `admin removed ${member.username}`,
      systemAction: "user_removed",
      meta: {
        actorId: userId,
        memberId,
        memberAvatar: member.avatar,
      },
    });

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
          unreadMessages = await Message.countDocuments({
            chatId: chat._id,
            receiverId: userId,
            status: { $ne: "seen" },
          });
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
    const { content, file, tempId, fileType, fileName, fileSize } = req.body;
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

      const receivers = chat.participants.filter(
        (user) => user.toString() !== userId
      );

      io.to(chatId).emit("newMessage", {
        _id: tempId,
        tempId: tempId,
        content: content,
        ...(file && { file }),
        ...(fileType && { fileType }),
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
          fileType,
          fileName,
          fileSize,
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
        _id: tempId,
        tempId: tempId,
        content: content,
        senderId: userId,
        receivers: receivers,
        chatId: chatId,
        ...(file && { file }),
        ...(fileType && { fileType }),
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
          fileType: fileType,
          fileName: fileName,
          fileSize: fileSize,
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

export const getChatFiles = async (req: Request, res: Response) => {
  try {
    const chatId = req.params.chatId;
    const userId = req.userId;

    if (!chatId) {
      res.status(400).json({ success: false, message: "Chat Id is required" });
      return;
    }

    const files = await Message.find({
      senderId: userId,
      chatId,
      file: { $exists: true },
    }).lean();

    res.status(200).json({
      success: true,
      message: "Files fetched successfully",
      data: files,
    });

    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
};

export const starMessage = async (req: Request, res: Response) => {
  try {
    const chatId = req.params.chatId;
    const { messageId } = req.body;

    const userId = req.userId;
    if (!chatId) {
      res.status(400).json({ success: false, message: "Chat Id is required" });
      return;
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      res.status(404).json({ success: false, message: "Chat does not exist" });
      return;
    }

    if (!chat.participants.includes(userId)) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const message = await Message.findById(messageId);

    if (!message) {
      res.status(404).json({ success: false, message: "message not found" });
      return;
    }

    if (message.starredBy?.includes(userId)) {
      res
        .status(400)
        .json({ success: false, message: " You already starred this message" });

      return;
    }

    if (!message.starredBy) {
      message.starredBy = [];
    }

    message.starredBy.push(userId);
    await message.save();

    res.status(200).json({
      success: true,
      message: "Message starred successfully",
    });

    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
};

export const getStarredMessages = async (req: Request, res: Response) => {
  try {
    const chatId = req.params.chatId;
    const userId = req.userId;

    if (!chatId) {
      res.status(400).json({ success: false, message: "Chat Id is required" });
      return;
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      res.status(404).json({ success: false, message: "Chat does not exist" });
      return;
    }

    const messages = await Message.find({
      chatId,
      starredBy: { $in: [userId] },
    }).lean();

    res.status(200).json({
      success: true,
      message: "starred messages fetched successfully",
      data: messages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
};
