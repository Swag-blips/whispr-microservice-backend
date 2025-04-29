import { cloudinaryConfig } from "../config/cloudinary";
import { Queue, Worker } from "bullmq";
import redisClient from "../config/redis";
import { v2 as cloudinary } from "cloudinary";
import logger from "./logger";
import { publishEvent } from "../config/rabbitMq";
import { Types } from "mongoose";

export const queue = new Queue("upload-avatar", {
  connection: redisClient,
});

export const uploadToCloudinary = async (
  imagePath: string,
  userId: Types.ObjectId
) => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: "user_avatars",
      public_id: `profileImg_${userId}`,
    });

    logger.info("image uploaded successfully");
    publishEvent("avatar.uploaded", {
      result: result.secure_url,
      userId,
    });
  } catch (error) {
    logger.error(error);
  }
};

const worker = new Worker(
  "upload-avatar",
  async (job: { data: { imagePath: string; userId: Types.ObjectId } }) => {
    const { imagePath, userId } = job.data;
    await uploadToCloudinary(imagePath, userId);
  }
);

(async () => {
  if (await queue.count()) {
    await worker.run();
  }
})();

worker.on("failed", (job: any, err) => {
  logger.error(`Image upload job failed for job ${job.id}:`, err);
});
