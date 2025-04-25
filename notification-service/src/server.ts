import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";

import errorHandler from "./middleware/errorHandler";
import logRequests from "./middleware/logRequests";
import logger from "./utils/logger";
import connectToMongo from "./config/dbConnect";
import limiter from "./middleware/rateLimit";
import { connectToRabbitMq, consumeEvent } from "./config/rabbitMq";
import { handleFriendRequestNotification } from "./events/eventHandler";

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
const PORT = process.env.PORT || 3004;

app.use(limiter);
app.use(errorHandler);
app.use(logRequests);

const startServer = async () => {
  try {
    await connectToMongo();
    await connectToRabbitMq();
    await consumeEvent(
      "friendRequest.created",
      handleFriendRequestNotification
    );

    app.listen(PORT, async () => {
      logger.info(`notification service is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error);
  }
};

startServer();
process.on("unhandledRejection", (error) => {
  logger.error("unhandledRejection", error);
});
