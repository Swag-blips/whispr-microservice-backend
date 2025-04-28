import express from "express";
import logger from "./utils/logger";
import connectToMongo from "./config/dbConnect";
import limiter from "./config/rateLimit";
import logRequests from "./utils/logRequests";
import helmet from "helmet";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import dotenv from "dotenv";
import { connectToRabbitMq, consumeEvent } from "./config/rabbitMq";
import { ChatCreatedEvent } from "./types/type";
import { handleCreateChat } from "./events/eventHandler";

dotenv.config();

const app = express();
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

    app.listen(PORT, () => {
      logger.info("server is listening on port", PORT);
    });
  } catch (error) {
    logger.error(error);
  }
};

startServer();
