import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import logger from "./utils/logger";
import errorHandler from "./middleware/errorHandler";
import logRequests from "./middleware/logRequests";
import connectToMongo from "./config/dbConnect";
import compression from "compression";
import { v2 as cloudinary } from "cloudinary";
import { connectToRabbitMq, consumeEvent } from "./config/rabbitMq";
import userRoutes from "./routes/user.route";
import limiter from "./config/rateLimit";
import {
  handleAddFriends,
  handleCreateUser,
  handleSaveAvatar,
} from "./events/eventHandler";
import {
  IncomingFriendsMessage,
  IncomingProfilePic,
  IncomingUserMessage,
} from "./types/types";

dotenv.config();

const app = express();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(
  cors({
    origin: "http://localhost:3006",
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json());
const PORT = process.env.PORT || 3002;

app.use(limiter);
app.use(compression());
app.use(errorHandler);
app.use(logRequests);

app.use("/api/user", limiter, userRoutes);

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      logger.info(`user service is running on port ${PORT}`);
    });

    await connectToMongo();
    await connectToRabbitMq();
    await consumeEvent<IncomingUserMessage>(
      "user.created",
      "user.create.queue", 
      handleCreateUser
    );
    await consumeEvent<IncomingFriendsMessage>(
      "friends.accept.created",
      "friends.accept.create.queue",
      handleAddFriends
    );
    await consumeEvent<IncomingProfilePic>(
      "avatar.uploaded",
      "avatar.uploaded.queue",
      handleSaveAvatar
    );
  } catch (error) {
    logger.error(error);
  }
};

startServer();
process.on("unhandledRejection", (error) => {
  console.error(`unhandled rejection ${error}`);
  process.exit(1);
});
