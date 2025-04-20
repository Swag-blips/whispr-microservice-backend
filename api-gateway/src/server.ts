import express from "express";
import dotenv from "dotenv";
import proxy from "express-http-proxy";
import logger from "./utils/logger";
import helmet from "helmet";
import errorHandler from "./middleware/errorHandler";
import proxyOptions from "./config/proxyOptions";
import logRequests from "./middleware/logRequests";
dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

app.use(helmet());
app.use(express.json());

app.use(errorHandler);

app.use(logRequests);

app.use(
  "/v1/auth",
  proxy(process.env.AUTH_SERVICE_PORT as string, {
    ...proxyOptions,
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `response gotten from auth service ${proxyRes.statusCode} ${proxyResData}`
      );

      return proxyResData;
    },
  })
);

app.listen(PORT, () => {
  logger.info(`api gateway is running on port ${PORT}`);
});

// The unhandledRejection listener
process.on("unhandledRejection", (error) => {
  logger.error("unhandledRejection", error);
});
