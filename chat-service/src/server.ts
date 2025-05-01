import express from "express";
import logger from "./utils/logger";
import connectToMongo from "./config/dbConnect";
import limiter from "./config/rateLimit";
import logRequests from "./utils/logRequests";
import cluster from "cluster";
import { app, server } from "./socket/socket";
import helmet from "helmet";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import dotenv from "dotenv";
import { connectToRabbitMq, consumeEvent } from "./config/rabbitMq";
import { ChatCreatedEvent, ChatDeletedEvent } from "./types/type";
import { handleCreateChat, handleDeleteFriends } from "./events/eventHandler";
import { initSocket } from "./utils/initSocket";

dotenv.config();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(limiter);

app.use(logRequests);
app.use(errorHandler);
const PORT = process.env.PORT || 3005;

export const startServer = async () => {
  try {
    await Promise.all([connectToMongo(), initSocket()]);

    server.listen(PORT, () => {
      logger.info("chat service is listening on port", PORT);
    });
  } catch (error) {
    logger.error(error);
  }
};
