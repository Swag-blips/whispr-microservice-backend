import Redis from "ioredis";

const redisClient: any = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

export default redisClient;
