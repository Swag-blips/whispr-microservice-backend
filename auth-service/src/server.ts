import express from "express";
import dotenv from "dotenv";
import logger from "./utils/logger";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import logRequests from "./middleware/logRequests";
import authRoutes from "./routes/auth.route";
dotenv.config();

const app = express();

app.use(cors());
const PORT = process.env.PORT || 3001;

app.use(errorHandler);
app.use(logRequests);

app.get("/api/auth", authRoutes);

app.listen(PORT, () => {
  logger.info(`auth service is running on port ${PORT}`);
});
