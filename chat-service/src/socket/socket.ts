import { Server } from "socket.io";
import express from "express";
import http from "http";
import logger from "../utils/logger";
import { Types } from "mongoose";
import {
  fetchPermissions,
  invalidatePermissions,
} from "../utils/fetchPermissions";
// // import { createAdapter } from "@socket.io/redis-adapter";
// import pubClient from "../config/redis";
import redisClient from "../config/redis";
import {
  markMessagesAsSeen,
  updateMessagesToDelivered,
} from "../utils/receipts";
export const app = express();

export const server = http.createServer(app);

const activeUsers = new Map<Types.ObjectId, string>();
// const subClient = pubClient.duplicate();

export const getReceiverSocketId = (userId: Types.ObjectId) => {
  console.log("ACTIVE USERS", activeUsers);
  return activeUsers.get(userId);
};

export const io = new Server(server, {
  cors: {
    origin: "*",
  },

  // adapter: createAdapter(pubClient, subClient),
  allowEIO3: true,
});

io.on("connection", async (socket) => {
  console.log(`user connected to socket server ${socket.id}`);

  const userId = socket.handshake.query.userId as unknown as Types.ObjectId;

  await updateMessagesToDelivered(userId);
  if (userId) {
    await redisClient.sadd("onlineUsers", userId as unknown as string);

    socket.join(userId as unknown as string);
  }

  // io.emit("getOnlineUsers", await redisClient.smembers("onlineUsers"));

  socket.on("joinRoom", async (chatId) => {
    console.log("SOCKET JOINS ROOM");
    socket.join(chatId);
    await redisClient.set(`currentChat:${userId}`, chatId);
    await markMessagesAsSeen(chatId, userId as unknown as string);
  });

  socket.on("startTyping", (data) => {
    const { chatId } = data;

    socket.to(chatId).emit("userTyping", "User is typing");
  });
  socket.on("stopTyping", (data) => {
    const { chatId } = data;

    socket.to(chatId).emit("stopTyping");
  });

  socket.on("leaveRoom", async (chatId) => {
    socket.leave(chatId);
    await redisClient.del(`currentChat:${userId}`, chatId);
  });

  if (userId) {
    await fetchPermissions(userId);
  }

  socket.on("disconnect", async () => {
    logger.info(`user disconnected from socket ${socket.id}`);

    socket.leave(userId as unknown as string);
    const [onlineUsers, permissions, userChats, currentChat] =
      await Promise.all([
        redisClient.srem("onlineUsers", userId as unknown as string),
        invalidatePermissions(userId),
        redisClient.del(`userChats:${userId}`),
        redisClient.del(`currentChat:${userId}`),
      ]);
    console.log(onlineUsers, permissions, userChats, currentChat);
  });
});
