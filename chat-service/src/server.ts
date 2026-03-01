import express from "express";
import logger from "./utils/logger";
import connectToMongo from "./config/dbConnect";
import limiter from "./config/rateLimit";
import logRequests from "./utils/logRequests";
import http from "http";
import helmet from "helmet";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import dotenv from "dotenv";
import chatRoutes from "./routes/message.route";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
if (
  process.env.NODE_ENV === "production" ||
  process.env.RUNNING_IN_DOCKER === "true"
) {
  dotenv.config({ path: ".env.docker" });
} else {
  dotenv.config({ path: ".env.local" });
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const app = express();
export const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3006", "https://whispr-liard.vercel.app"],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 20000,
  allowEIO3: true,
});

app.use(
  cors({
    origin: ["http://localhost:3006", "https://whispr-liard.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(helmet());
app.use(express.json({ limit: "10mb" }));

app.use(cookieParser());
app.use(limiter);

app.use(logRequests);
app.use(errorHandler);

app.use("/api/chat", chatRoutes);
const PORT = process.env.PORT || 3009;

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