import redisClient from "../config/redis";

export const getCachedMessages = async (chatId: string) => {
  const cacheKey = `messages:${chatId}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);
  return null;
};

export const cacheMessages = async (chatId: string, messages: any) => {
  const cacheKey = `messages:${chatId}`;
  const expiry = 5 * 60;
  await redisClient.set(cacheKey, JSON.stringify(messages), "EX", expiry);
};

export const invalidateChatMessagesCache = async (chatId: string) => {
  const cacheKey = `messages:${chatId}`;
  await redisClient.del(cacheKey);
  return
};
   