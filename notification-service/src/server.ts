import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import errorHandler from "./middleware/errorHandler";
import logRequests from "./middleware/logRequests";
import logger from "./utils/logger";
import connectToMongo from "./config/dbConnect";
import limiter from "./config/rateLimit";
import { connectToRabbitMq, consumeEvent } from "./config/rabbitMq";
import {
  handleFriendRequestAccept,
  handleFriendRequestDecline,
  handleFriendRequestNotification,
} from "./events/eventHandler";
import notificationRoutes from "../src/routes/notification.route";
import cookieParser from "cookie-parser";

if (
  process.env.NODE_ENV === "production" ||
  process.env.RUNNING_IN_DOCKER === "true"
) {
  dotenv.config({ path: ".env.docker" });
} else {
  dotenv.config({ path: ".env.local" });
}

const app = express();

app.use(
  cors({
    origin: ["https://whispr-liard.vercel.app", "http://localhost:3006"],
    credentials: true,
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json());

app.use("/api/notifications", notificationRoutes);
const PORT = process.env.PORT || 3004;

app.use(limiter);
app.use(errorHandler);
app.use(logRequests);

const startServer = async () => {
  try {
    await Promise.all([
      connectToMongo(),
      connectToRabbitMq(),

      consumeEvent(
        "friendRequest.created",
        "notification.friendRequest.created.queue",
        handleFriendRequestNotification
      ),
      consumeEvent(
        "friendRequest.accepted",
        "notification.friendRequest.accepted.queue",
        handleFriendRequestAccept
      ),
      consumeEvent(
        "friendRequest.declined",
        "notification.friendRequest.declined.queue",
        handleFriendRequestDecline
      ),
    ]);

    app.listen(PORT, async () => {
      logger.info(`notification service is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error);
  }
};

startServer();

process.on("unhandledRejection", (error) => {
  console.error(`unhandled rejection ${error}`);
  process.exit(1);
});
