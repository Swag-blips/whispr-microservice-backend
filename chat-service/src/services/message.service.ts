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

export const sendMessageService = async (params: {
  chatId: string;
  userId: Types.ObjectId;
  content: string;
  file?: string;
  tempId?: string;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
}) => {
  const {
    chatId,
    userId,
    content,
    file,
    tempId,
    fileType,
    fileName,
    fileSize,
  } = params;

  const permittedChats = await redisClient.smembers(`permittedChats${userId}`);
  const chatParticipants = await redisClient.smembers(`permissions${chatId}`);

  if (!permittedChats.length || !chatParticipants.length) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    if (!chat.participants.some((p) => p.toString() === userId.toString())) {
      throw new Error("Not permitted");
    }

    const receiverId = chat.participants.find(
      (user) => user.toString() !== userId.toString(),
    );

    const receiver = await redisClient.sismember(
      "onlineUsers",
      receiverId as unknown as string,
    );
    const receiverCurrentChat = await redisClient.get(
      `currentChat:${receiverId}`,
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
        receiverCurrentChat === chatId && receiver
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
        fileType: fileType,
        fileName: fileName,
        fileSize: fileSize,
        status:
          receiverCurrentChat === chatId && receiver
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
      },
    );

    await redisClient.sadd(`permittedChats${userId}`, chat._id.toString());
    await redisClient.sadd(
      `permissions${chatId}`,
      ...chat.participants.map((id) => id.toString()),
    );

    await invalidateChatMessagesCache(chatId);

    return;
  } else {
    if (!permittedChats.includes(chatId.toString())) {
      throw new Error("Not permitted");
    }

    if (!chatParticipants.includes(userId.toString())) {
      throw new Error("Not permitted");
    }

    const receiverId = chatParticipants.find(
      (user) => user.toString() !== userId.toString(),
    );

    if (!receiverId) {
      throw new Error("No receivers");
    }

    const receiver = await redisClient.sismember(
      "onlineUsers",
      receiverId as unknown as string,
    );
    const receiverCurrentChat = await redisClient.get(
      `currentChat:${receiverId}`,
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
        receiverCurrentChat === chatId && receiver
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
          receiverCurrentChat === chatId && receiver
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
      },
    );

    await invalidateChatMessagesCache(chatId);

    return;
  }
};

export const getMessagesService = async (params: { chatId: string }) => {
  const { chatId } = params;

  const cached = await getCachedMessages(chatId);
  if (cached) {
    return cached;
  }

  const messages = await Message.find({ chatId }).lean();
  if (!messages.length) {
    return [];
  }

  await cacheMessages(chatId, messages);

  return messages;
};

export const createGroupService = async (params: {
  userId: string;
  participants: Types.ObjectId[];
  groupName: string;
  bio?: string;
}) => {
  const { userId, participants, groupName, bio } = params;

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
    participants.map(async (participantId: Types.ObjectId) => {
      Promise.all([
        redisClient.del(`userChats:${participantId}`),
        redisClient.sadd(`permittedChats${participantId}`, chat._id.toString()),
      ]);
    }),
  );

  await redisClient.sadd(`permissions${chat._id.toString()}`, ...participants);

  logger.info("Group successfully created");

  return chat;
};

export const addMemberToGroupService = async (params: {
  chatId: string;
  userId: string;
  participants: string[];
}) => {
  const { chatId, userId, participants } = params;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new Error("Chat not found");
  }

  if (chat.adminId?.toString() !== userId.toString()) {
    throw new Error("Youre not authorized to add a user");
  }

  const alreadyExists = participants.some((participant: any) =>
    chat.participants.some((p) => p.toString() === participant.toString()),
  );

  if (alreadyExists) {
    throw new Error("One member already exists");
  }

  chat.participants.push(...participants);

  await chat.save();

  await Promise.all(
    participants.map((participantId: any) =>
      redisClient.del(`userChats:${participantId}`),
    ),
  );
  await redisClient.del(`userChats:${userId}`);
  await redisClient.sadd(`permissions${chatId}`, ...participants);

  participants.forEach(async (participant: string) => {
    await redisClient.sadd(`permittedChats${participant}`, chatId);
  });

  participants.forEach(async (participant: string) => {
    const participantDetailsString = await redisClient.get(
      `user:${participant}`,
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

  return;
};

export const removeMemberFromGroupService = async (params: {
  chatId: string;
  userId: string;
  memberId: string;
}) => {
  const { chatId, userId, memberId } = params;

  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    throw new Error("invalid ID");
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new Error("Chat not found");
  }

  if (!chat.participants.some((p) => p.toString() === memberId.toString())) {
    throw new Error("User is not a member of the chat");
  }

  if (chat.adminId?.toString() !== userId.toString()) {
    throw new Error("Youre not authorized to remove a user");
  }

  if (!chat.participants.some((p) => p.toString() === userId.toString())) {
    throw new Error(
      "Unauthorized access, you must be a member to remove other users",
    );
  }

  if (chat.participants.length <= 2) {
    await chat.deleteOne();
    await Message.deleteMany({ chatId: chatId });

    await Promise.all([
      redisClient.srem(`permissions${chatId}`, memberId),
      redisClient.srem(`permittedChats${memberId}`, chatId),
      chat.participants.forEach(async (participant) => {
        redisClient.del(`userChats:${participant.toString()}`);
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

  return;
};

export const updateGroupDetailsService = async (params: {
  chatId: string;
  userId: string;
  bio?: string;
  groupName?: string;
}) => {
  const { chatId, userId, bio, groupName } = params;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new Error("Chat not found");
  }

  if (!chat.participants.some((p) => p.toString() === userId.toString())) {
    throw new Error(
      "Unauthorized access, you must be a member to update details",
    );
  }

  chat.bio = bio || chat.bio;
  chat.groupName = groupName || chat.groupName;

  await chat.save();

  await redisClient.del(`userChats:${userId}`);

  return;
};

export const getUserChatsService = async (params: { userId: string }) => {
  const { userId } = params;

  const cachedUserChats = await redisClient.get(`userChats:${userId}`);

  if (cachedUserChats) {
    return JSON.parse(cachedUserChats);
  }

  const chats = await Chat.find({
    participants: userId,
  }).lean();

  if (!chats.length) {
    return [];
  }

  const transformedChats = await Promise.all(
    chats.map(async (chat) => {
      const otherUsers = chat.participants.filter(
        (participant) => participant.toString() !== userId.toString(),
      );

      const time = chat.updatedAt;
      const transformedTime = time.getTime();

      const otherUsersDetails = await Promise.all(
        otherUsers.map(
          async (user) =>
            await User.findById(user._id).select("username avatar bio").lean(),
        ),
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
    }),
  );

  await redisClient.set(
    `userChats:${userId}`,
    JSON.stringify(transformedChats),
    "EX",
    300,
  );

  return transformedChats;
};

export const sendGroupMessageService = async (params: {
  chatId: string;
  userId: string;
  content: string;
  file?: string;
  tempId?: string;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
}) => {
  const {
    chatId,
    userId,
    content,
    file,
    tempId,
    fileType,
    fileName,
    fileSize,
  } = params;

  const permittedChats = await redisClient.smembers(`permittedChats${userId}`);
  const chatParticipants = await redisClient.smembers(`permissions${chatId}`);

  if (!permittedChats.length || !chatParticipants.length) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    if (!chat.participants.some((p) => p.toString() === userId.toString())) {
      throw new Error("Not permitted");
    }

    const receivers = chat.participants.filter(
      (user) => user.toString() !== userId,
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
      },
    );

    await redisClient.sadd(`permittedChats${userId}`, chat._id.toString());
    await redisClient.sadd(
      `permissions${chatId}`,
      ...chat.participants.map((id) => id.toString()),
    );

    await invalidateChatMessagesCache(chatId);

    return;
  } else {
    if (!permittedChats.includes(chatId.toString())) {
      throw new Error("Not permitted");
    }

    if (!chatParticipants.includes(userId)) {
      throw new Error("Not permitted");
    }

    const receivers = chatParticipants.filter(
      (user) => user.toString() !== userId,
    );
    if (!receivers.length) {
      throw new Error("No receivers");
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
      },
    );

    await invalidateChatMessagesCache(chatId);

    return;
  }
};

export const getChatFilesService = async (params: {
  chatId: string;
  userId: string;
}) => {
  const { chatId, userId } = params;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new Error("404");
  }

  if (!chat.participants.some((p) => p.toString() === userId.toString())) {
    throw new Error("Unauthorized");
  }

  const files = await Message.find({
    chatId,
    file: { $exists: true },
  }).lean();

  return files;
};

export const starMessageService = async (params: {
  chatId: string;
  userId: string;
  messageId: string;
}) => {
  const { chatId, userId, messageId } = params;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new Error("Chat does not exist");
  }

  if (!chat.participants.some((p) => p.toString() === userId.toString())) {
    throw new Error("Unauthorized");
  }

  const message = await Message.findById(messageId);

  if (!message) {
    throw new Error("message not found");
  }

  if (message.starredBy?.some((p) => p.toString() === userId.toString())) {
    throw new Error("You already starred this message");
  }

  if (!message.starredBy) {
    message.starredBy = [];
  }

  message.starredBy.push(userId as unknown as Types.ObjectId);
  await message.save();

  return;
};

export const getStarredMessagesService = async (params: {
  chatId: string;
  userId: string;
}) => {
  const { chatId, userId } = params;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new Error("Chat does not exist");
  }

  const messages = await Message.find({
    chatId,
    starredBy: { $in: [userId] },
  }).lean();

  return messages;
};
