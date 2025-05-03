import { Queue, Worker } from "bullmq";
import logger from "./logger";
import { Types } from "mongoose";
import redisClient from "../config/redis";
import Chat from "../models/chat.model";

export const queue = new Queue("update-last-message", {
  connection: redisClient,
});

const updateLastMessage = async (message: string, chatId: Types.ObjectId) => {
  console.log(`update last message ${message} ${chatId}`);
  try {
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message,
    });

    logger.info("Chat updated sucessfully");
  } catch (error) {
    logger.error(error);
  }
};

const worker = new Worker(
  "update-last-message",
  async (job: { data: { message: string; chatId: Types.ObjectId } }) => {
    const { message, chatId } = job.data;
    await updateLastMessage(message, chatId);
  },
  {
    connection: redisClient,
  }
);

worker.on("failed", (job, err) => {
  logger.error(`Image upload job failed for job ${job?.id}:`, err);
});
