import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import logger from "./utils/logger";
import errorHandler from "./middleware/errorHandler";
import logRequests from "./middleware/logRequests";
import connectToMongo from "./config/dbConnect";

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
const PORT = process.env.PORT || 3002;

app.use(errorHandler);
app.use(logRequests);

app.listen(PORT, () => {
  logger.info(`auth service is running on port ${PORT}`);
  connectToMongo();
});

process.on("unhandledRejection", (error) => {
  logger.error("unhandledRejection", error);
});
