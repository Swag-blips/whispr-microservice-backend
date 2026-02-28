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

const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    logger.info("Performing database health check...");
    await connectToMongo();
    logger.info("Database connection health check passed");
    return true;
  } catch (error) {
    logger.error(
      `Database health check failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
};

const startServer = async () => {
  try {
    logger.info("Starting friend service initialization...");

    const isDatabaseHealthy = await checkDatabaseHealth();
    if (!isDatabaseHealthy) {
      logger.error(
        "Failed to establish database connection. Server startup aborted."
      );
      process.exit(1);
    }

    await connectToRabbitMq();

    app.listen(PORT, async () => {
      logger.info(`friend service is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(
      `Server startup failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
};

startServer();

process.on("unhandledRejection", (error) => {
  console.error(`unhandled rejection ${error}`);
  process.exit(1);
});