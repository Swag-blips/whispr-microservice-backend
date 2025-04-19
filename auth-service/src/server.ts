import express from "express";
import dotenv from "dotenv";
import logger from "./utils/logger";
import cors from "cors";
dotenv.config();

const app = express();

app.use(cors());
const PORT = process.env.PORT || 3001;

app.get("/api/auth/register", (req, res) => {
  logger.info("Request received");
});

app.listen(PORT, () => {
  logger.info(`auth service is running on port ${PORT}`);
});
