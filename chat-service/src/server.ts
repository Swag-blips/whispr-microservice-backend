import express from "express";
import logger from "./utils/logger";
import connectToMongo from "./config/dbConnect";
import limiter from "./config/rateLimit";
import logRequests from "./utils/logRequests";
import { app, server } from "./socket/socket";
import helmet from "helmet";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import dotenv from "dotenv";
import { connectToRabbitMq, consumeEvent } from "./config/rabbitMq";
import { ChatCreatedEvent } from "./types/type";
import { handleCreateChat } from "./events/eventHandler";
import { fetchPermissions } from "./utils/fetchPermissions";
import redisClient from "./config/redis";

dotenv.config();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(limiter);
app.use(logRequests);
app.use(errorHandler);
const PORT = process.env.PORT || 3005;

const startServer = async () => {
  try {
    await connectToMongo();
    await connectToRabbitMq();
    await consumeEvent<ChatCreatedEvent>(
      "chat.created.queue",
      "chat.created",
      handleCreateChat
    );

    server.listen(PORT, () => {
      logger.info("chat service is listening on port", PORT);
    });
  } catch (error) {
    logger.error(error);
  }
};

startServer();
