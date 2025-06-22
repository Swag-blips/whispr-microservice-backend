import express from "express";
import logger from "./utils/logger";
import connectToMongo from "./config/dbConnect";
import limiter from "./config/rateLimit";
import logRequests from "./utils/logRequests";
import { app, server } from "./socket/socket";
import helmet from "helmet";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import dotenv from "dotenv";
import chatRoutes from "./routes/message.route";

dotenv.config();

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
app.use(express.json({ limit: "10mb" }));
app.use(limiter);

app.use(logRequests);
app.use(errorHandler);

app.use("/api/chat", chatRoutes);
app.get("/health", (req, res) => {
  res.status(200).send("Chat service is healthy");
});
const PORT = process.env.PORT || 3005;

export const startServer = async () => {
  try {
    await Promise.all([connectToMongo()]);

    server.listen(Number(PORT), "0.0.0.0", () => {
      logger.info(`chat service is listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error);
  }
};

process.on("unhandledRejection", (error) => {
  console.error(`unhandled rejection ${error}`);
  process.exit(1);
});
