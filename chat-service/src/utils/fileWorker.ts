import { Queue, Worker } from "bullmq";
import { v2 as cloudinary } from "cloudinary";
import logger from "./logger";
import { Types } from "mongoose";
import redisClient from "../config/redis";

export const queue = new Queue("upload-message-image", {
  connection: redisClient,
});

const uploadToCloudinary = async (
  imagePath: string,
  messageId: Types.ObjectId
) => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: "messages_images",
      public_id: `message_${messageId}`,
    });

    logger.info("image uploaded successfully");
  } catch (error) {
    logger.error(error);
  }
};

const worker = new Worker(
  "upload-message-image",
  async (job: { data: { imagePath: string; messageId: Types.ObjectId } }) => {
    const { imagePath, messageId } = job.data;
    await uploadToCloudinary(imagePath, messageId);
  },
  {
    connection: redisClient,
  }
);
worker.on("failed", (job, err) => {
  logger.error(`Image upload job failed for job ${job?.id}:`, err);
});
