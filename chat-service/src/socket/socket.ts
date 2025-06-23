import { Server } from "socket.io";
import express from "express";
import http from "http";
import logger from "../utils/logger";

import { DecodedUser } from "../middleware/authenticateRequest";
import { Types } from "mongoose";
import {
  fetchPermissions,
  invalidatePermissions,
} from "../utils/fetchPermissions";
import { createAdapter } from "@socket.io/redis-adapter";
import pubClient from "../config/redis";
export const app = express();

export const server = http.createServer(app);

const activeUsers = new Map<Types.ObjectId, string>();
const subClient = pubClient.duplicate();

export const getReceiverSocketId = (userId: Types.ObjectId) => {
  console.log("ACTIVE USERS", activeUsers)
  return activeUsers.get(userId);
};

export const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3006"],
  },
  adapter: createAdapter(pubClient, subClient),
});

io.on("connection", async (socket) => {
  console.log(`user connected to socket server ${socket.id}`);
  const userId = socket.handshake.query.userId as unknown as Types.ObjectId;

  if (userId) {
    activeUsers.set(userId, socket.id);
  }

  io.emit("getOnlineUsers", [...activeUsers.keys()]);

  socket.on("joinRoom", (chatId) => {
    console.log("SOCKET JOINS ROOM");
    socket.join(chatId);
  });

  socket.on("startTyping", (data) => {
    const { chatId } = data;

    socket.to(chatId).emit("userTyping", "User is typing");
  });
  socket.on("stopTyping", (data) => {
    const { chatId } = data;

    socket.to(chatId).emit("stopTyping");
  });

  socket.on("leaveRoom", (chatId) => {
    socket.leave(chatId);
  });

  if (userId) {
    await fetchPermissions(userId);
  }

  socket.on("disconnect", async () => {
    logger.info(`user disconnected from socket ${socket.id}`);
    activeUsers.delete(userId);
    await invalidatePermissions(userId);
  });
});
