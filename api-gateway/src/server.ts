import express from "express";
import dotenv from "dotenv";
import proxy from "express-http-proxy";
import logger from "./utils/logger";
import helmet from "helmet";
import errorHandler from "./middleware/errorHandler";
import proxyOptions from "./config/proxyOptions";
import cors from "cors";
import logRequests from "./middleware/logRequests";
import limiter from "./config/rateLimit";
import { corsOptions } from "./config/corsOptions";
dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "5mb" }));

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
  "/v1/notifications",
  proxy(process.env.NOTIFICATION_SRVICE_PORT as string, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (proxyReqOpts.headers) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `response gotten from notification service ${proxyRes.statusCode} ${proxyResData}`
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

process.on("unhandledRejection", (error) => {
  logger.error("unhandledRejection", error);
});

