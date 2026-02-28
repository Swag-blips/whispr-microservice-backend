import mongoose from "mongoose";
import logger from "../utils/logger";

const MAX_RETRIES = 5;
const INITIAL_DELAY = 1000; // 1 second
const MAX_DELAY = 30000; // 30 seconds

interface ConnectionAttempt {
  attemptNumber: number;
  timestamp: Date;
  error?: string;
}

const connectionAttempts: ConnectionAttempt[] = [];

const calculateBackoffDelay = (attemptNumber: number): number => {
  const exponentialDelay = INITIAL_DELAY * Math.pow(2, attemptNumber - 1);
  return Math.min(exponentialDelay, MAX_DELAY);
};

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const connectToMongo = async (): Promise<void> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info(
        `MongoDB connection attempt ${attempt}/${MAX_RETRIES} at ${new Date().toISOString()}`
      );

      const connection = await mongoose.connect(
        process.env.MONGODB_URI as string,
        {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
          minPoolSize: 2,
          retryWrites: true,
          w: "majority",
          connectTimeoutMS: 10000,
        }
      );

      logger.info(
        `Successfully connected to MongoDB at ${connection.connection.host}:${connection.connection.port} on attempt ${attempt}`
      );

      connectionAttempts.push({
        attemptNumber: attempt,
        timestamp: new Date(),
      });

      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const errorMessage =
        lastError instanceof Error ? lastError.message : String(lastError);

      connectionAttempts.push({
        attemptNumber: attempt,
        timestamp: new Date(),
        error: errorMessage,
      });

      if (attempt === MAX_RETRIES) {
        logger.error(
          `Failed to connect to MongoDB after ${MAX_RETRIES} attempts. Last error: ${errorMessage}`
        );
        logger.error(`Connection attempt history: ${JSON.stringify(connectionAttempts)}`);
        throw new Error(
          `MongoDB connection failed after ${MAX_RETRIES} retries: ${errorMessage}`
        );
      }

      const delayMs = calculateBackoffDelay(attempt);
      logger.warn(
        `MongoDB connection attempt ${attempt} failed: ${errorMessage}. Retrying in ${delayMs}ms...`
      );

      await sleep(delayMs);
    }
  }
};

export default connectToMongo;
export { connectionAttempts, ConnectionAttempt };