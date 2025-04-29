import { Server } from "socket.io";
import express from "express";
import http from "http";
import logger from "../utils/logger";
import jwt from "jsonwebtoken";
import { DecodedUser } from "../middleware/authenticateRequest";
import { Types } from "mongoose";
import {
  fetchPermissions,
  invalidatePermissions,
} from "../utils/fetchPermissions";

export const app = express();

export const server = http.createServer(app);

const activeUsers = new Map<string, Types.ObjectId>();

export const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5000"],
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication error: Token required"));
  }

  try {
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET_KEY as string
    ) as DecodedUser;

    if (!decodedToken) {
      return next(new Error("invalid or expired token"));
    }

    socket.userId = decodedToken.userId;
  } catch (error) {
    return next(new Error("Authentication error: Invalid required"));
  }
});

io.on("connection", async (socket) => {
  logger.info(`user connected to server ${socket.userId}`);
  activeUsers.set(socket.id, socket.userId);
  await fetchPermissions(socket.userId);

  socket.on("disconnect", async () => {
    logger.info(`user disconnected from socket ${socket.id}`);
    activeUsers.delete(socket.id);
    await invalidatePermissions(socket.userId);
  });
});
