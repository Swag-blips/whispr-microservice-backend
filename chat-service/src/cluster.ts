import cluster from "cluster";
import os from "os";
import http from "http";
import logger from "./utils/logger";
import { Types } from "mongoose";

import { connectToRabbitMq, consumeEvent } from "./config/rabbitMq";
import { ChatCreatedEvent, ChatDeletedEvent } from "./types/type";
import { handleCreateChat, handleDeleteFriends } from "./events/eventHandler";

import { setupMaster, setupWorker } from "@socket.io/sticky";
import { createAdapter, setupPrimary } from "@socket.io/cluster-adapter";
import redisClient from "./config/redis";
import {
  markMessagesAsSeen,
  updateMessagesToDelivered,
} from "./utils/receipts";
import {
  fetchPermissions,
  invalidatePermissions,
} from "./utils/fetchPermissions";
import { io, server, startServer } from "./server";
import connectToMongo from "./config/dbConnect";

const numOfCpus = os.cpus().length;
const PORT = process.env.PORT || 3005;

if (cluster.isPrimary) {
  const httpServer = http.createServer();

  // Setup sticky sessions so socket connection stick to workers
  setupMaster(httpServer, {
    loadBalancingMethod: "least-connection", // or round-robin
  });

  // Setup cluster adapter primary (internal IPC between workers)
  setupPrimary();

  httpServer.listen(PORT, () => {
    logger.info(`Primary process listening on port ${PORT}`);
  });

  // Fork workers
  for (let i = 0; i < numOfCpus; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.info(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  (async () => {
    await connectToMongo();
  })();
  io.adapter(createAdapter());
  setupWorker(io);

  io.on("connection", async (socket) => {
    logger.info(`User connected to socket server ${socket.id}`);

    const userId = socket.handshake.query.userId as unknown as Types.ObjectId;

    if (userId) {
      await updateMessagesToDelivered(userId);
      await redisClient.sadd("onlineUsers", userId.toString());

      socket.join(userId.toString());
    }

    const onlineUsers = await redisClient.smembers("onlineUsers");

    io.emit("onlineUsers", JSON.stringify(onlineUsers));

    socket.on("joinRoom", async (chatId) => {
      logger.info("Socket joins room: " + chatId);
      socket.join(chatId);
      await redisClient.set(`currentChat:${userId}`, chatId);
      await markMessagesAsSeen(chatId, userId.toString());
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
      logger.info(`User disconnected from socket ${socket.id}`);

      socket.leave(userId.toString());

      const [onlineUsers, permissions, userChats, currentChat] =
        await Promise.all([
          redisClient.srem("onlineUsers", userId.toString()),
          invalidatePermissions(userId),
          redisClient.del(`userChats:${userId}`),
          redisClient.del(`currentChat:${userId}`),
        ]);

      logger.info(
        `Clean up done on disconnect: ${onlineUsers}, ${permissions}, ${userChats}, ${currentChat}`
      );
    });
  });

  if (cluster.worker?.id === 1) {
    connectToRabbitMq();
    consumeEvent<ChatCreatedEvent>(
      "chat.created.queue",
      "chat.created",
      handleCreateChat
    );

    consumeEvent<ChatDeletedEvent>(
      "chat.deleted.queue",
      "chat.deleted",
      handleDeleteFriends
    );
  }
}
