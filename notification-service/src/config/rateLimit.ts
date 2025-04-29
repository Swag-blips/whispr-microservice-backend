import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { RedisReply } from "rate-limit-redis"; // if exported
import redisClient from "./redisClient";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,

  store: new RedisStore({
    sendCommand: (...args: string[]): Promise<RedisReply> => {
      return redisClient.call(
        ...(args as [string, ...string[]])
      ) as Promise<RedisReply>;
    },
  }),
});

export default limiter;
