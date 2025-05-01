import { Queue, Worker } from "bullmq";
import { v2 as cloudinary } from "cloudinary";
import logger from "./logger";
import { Types } from "mongoose";
import redisClient from "../config/redis";
import Message from "../models/message.model";

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

    await Message.findByIdAndUpdate(messageId, {
      file: result.secure_url,
    });

    logger.info("message image saved");
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
