import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import logger from "./utils/logger";
import errorHandler from "./middleware/errorHandler";
import logRequests from "./middleware/logRequests";
import connectToMongo from "./config/dbConnect";
import { connectToRabbitMq, consumeEvent } from "./config/rabbitMq";
import handleCreatedUser from "./events/eventHandler";
import userRoutes from "./routes/user.route";
import limiter from "./config/rateLimit";

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
const PORT = process.env.PORT || 3002;

app.use(limiter);
app.use(errorHandler);
app.use(logRequests);

app.use("/api/user", limiter, userRoutes);

const startServer = async () => {
  try {
    await connectToMongo();
    await connectToRabbitMq();
    await consumeEvent("user.created", handleCreatedUser);

    app.listen(PORT, async () => {
      logger.info(`user service is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error);
  }
};

startServer();
process.on("unhandledRejection", (error) => {
  logger.error("unhandledRejection", error);
});
