import redisClient from "../config/redis";

export const getCachedMessages = async (chatId: string, userId: string) => {
  const cacheKey = `messages:${chatId}:${userId}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);
  return null;
};

export const cacheMessages = async (
  chatId: string,
  userId: string,
  messages: any
) => {
  const cacheKey = `messages:${chatId}:${userId}`;
  const expiry = 5 * 60;
  await redisClient.set(cacheKey, JSON.stringify(messages), "EX", expiry);
};

export const invalidateChatMessagesCache = async (
  chatId: string,
  participantIds: string[]
) => {
  const keysToDelete = participantIds.map((id) => `messages:${chatId}:${id}`);
  if (keysToDelete.length) {
    await redisClient.del(...keysToDelete);
  }
};
