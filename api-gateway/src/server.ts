import express, { Request, Response } from "express";
import dotenv from "dotenv";
import proxy from "express-http-proxy";
import logger from "./utils/logger";
import helmet from "helmet";
import errorHandler from "./middleware/errorHandler";
import proxyOptions from "./config/proxyOptions";
import logRequests from "./middleware/logRequests";
import limiter from "./config/rateLimit";
dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

app.use(helmet());
app.use(express.json());

app.use(errorHandler);
app.use(limiter);
app.use(logRequests);

app.use(
  "/v1/auth",
  proxy(process.env.AUTH_SERVICE_PORT as string, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (proxyReqOpts.headers) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }

      return proxyReqOpts;
    },

    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `response gotten from auth service ${proxyRes.statusCode} ${proxyResData}`
      );

      return proxyResData;
    },
  })
);

app.use(
  "/v1/user",
  proxy(process.env.USER_SERVICE_PORT as string, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (proxyReqOpts.headers) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
        proxyReqOpts.headers["Bearer-Token"] = srcReq.headers.authorization;
      }

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `response gotten from user service ${proxyRes.statusCode} ${proxyResData}`
      );

      return proxyResData;
    },
  })
);

app.use(
  "/v1/friend",
  proxy(process.env.FRIEND_SERVICE_PORT as string, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (proxyReqOpts.headers) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `response gotten from friend service ${proxyRes.statusCode} ${proxyResData}`
      );

      return proxyResData;
    },
  })
);


app.use(
  "/v1/chat",
  proxy(process.env.CHAT_SERVICE_PORT as string, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (proxyReqOpts.headers) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `response gotten from chat service ${proxyRes.statusCode} ${proxyResData}`
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
