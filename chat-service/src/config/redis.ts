import Redis from "ioredis";

const redisClient = new Redis({
  host: "127.0.0.1",
  port: 6379,
  lazyConnect: true,
});

export default redisClient;
