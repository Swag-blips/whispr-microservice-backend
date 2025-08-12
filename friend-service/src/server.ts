import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import logger from "./utils/logger";
import errorHandler from "./middleware/errorHandler";
import logRequests from "./middleware/logRequests";
import limiter from "./config/rateLimit";
import connectToMongo from "./config/dbConnect";
import friendRoutes from "./routes/friendRequest.route";
import { connectToRabbitMq } from "./config/rabbitMq";
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
    origin: ["http://localhost:3006", "https://whispr-liard.vercel.app"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(helmet());
app.use(express.json());
const PORT = process.env.PORT || 3003;

app.use(limiter);
app.use(errorHandler);
app.use(logRequests);

app.use("/api/friend", friendRoutes);

const startServer = async () => {
  try {
    await connectToMongo();
    await connectToRabbitMq();

    app.listen(PORT, async () => {
      logger.info(`friend service is running on port ${PORT}`);
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
