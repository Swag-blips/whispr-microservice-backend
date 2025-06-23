import { Queue, Worker } from "bullmq";
import redisClient from "../config/redis";
import Message from "../models/message.model";

import logger from "./logger";
import mongoose, { Types } from "mongoose";
import { connection } from "../config/dbConnect";

export const queue = new Queue("add-message", {
  connection: redisClient,
});

const addMessage = async (
  content: string,
  chatId: Types.ObjectId,
  receiverId: Types.ObjectId,
  userId: Types.ObjectId
) => {
  try {
    if (!connection) {
      await mongoose.connect(process.env.MONGODB_URI as string);
    }
    const message = await Message.create({
      chatId,
      content,
      receiverId,
      senderId: userId,
    });

    if (message) {
      logger.info(`Message added successfully `);
    }
    return;
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

const worker = new Worker(
  "add-message",
  async (job: {
    data: {
      content: string;
      chatId: Types.ObjectId;
      receiverId: Types.ObjectId;
      userId: Types.ObjectId;
    };
  }) => {
    const { content, chatId, receiverId, userId } = job.data;
    await addMessage(content, chatId, receiverId, userId);
  },
  {
    connection: redisClient,
  }
);

worker.on("failed", (job, err) => {
  logger.error(`add message job failed for ${job?.id}:`, err);
});
