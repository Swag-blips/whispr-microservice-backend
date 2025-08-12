import express from "express";
import dotenv from "dotenv";
import logger from "./utils/logger";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import logRequests from "./middleware/logRequests";
import authRoutes from "./routes/auth.route";
import connectToMongo from "./config/dbConnect";
import helmet from "helmet";
import { connectToRabbitMq } from "./config/rabbitMq";
import limiter from "./config/rateLimit";
import { v2 as cloudinary } from "cloudinary";
import compression from "compression";
import { initalizeImageWorker } from "./utils/imageWorker";
import { initalizeEmailWorker } from "./utils/emailWorker";
import cookieParser from "cookie-parser";

if (
  process.env.NODE_ENV === "production" ||
  process.env.RUNNING_IN_DOCKER === "true"
) {
  dotenv.config({ path: ".env.docker" });
} else {
  dotenv.config({ path: ".env.local" });
}

export const app = express();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(
  cors({
    credentials: true,
    origin: ["https://whispr-liard.vercel.app", "http://localhost:3006"],
  })
);
app.use(helmet());
app.use(compression());
app.use(cookieParser());

app.use(express.json({ limit: "5mb" }));
const PORT = process.env.PORT || 3001;

app.use(limiter);

app.use(errorHandler);
app.use(logRequests);

app.use("/api/auth", limiter, authRoutes);

export const server = app.listen(PORT, async () => {
  logger.info(`auth service is running on port ${PORT}`);
  await connectToMongo();
  await connectToRabbitMq();
  initalizeImageWorker();
  initalizeEmailWorker();
});

process.on("unhandledRejection", (error) => {
  console.error(`unhandled rejection ${error}`);
  process.exit(1);
});
