import { Server } from "socket.io";
import express from "express";
import http from "http";
import logger from "../utils/logger";

export const app = express();

export const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5000"],
  },
});

io.on("connection", (socket) => {
  logger.info(`user connected to server ${socket.id}`);

  socket.on("disconnect", () => {
    logger.info(`user disconnected from socket ${socket.id}`);
  });
});
