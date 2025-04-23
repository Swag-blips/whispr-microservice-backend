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

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
const PORT = process.env.PORT || 3001;

app.use(errorHandler);
app.use(logRequests);

app.use("/api/auth", authRoutes);

app.listen(PORT, async () => {
  logger.info(`auth service is running on port ${PORT}`);
  await connectToMongo();
  await connectToRabbitMq();
});

process.on("unhandledRejection", (error) => {
  logger.error("unhandledRejection", error);
});
