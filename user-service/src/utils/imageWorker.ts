import { Queue, Worker } from "bullmq";
import redisClient from "../config/redis";
import { v2 as cloudinary } from "cloudinary";
import logger from "./logger";
import { Types } from "mongoose";
import User from "../models/user.model";

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

    await User.findByIdAndUpdate(userId, {
      avatar: result.secure_url,
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
  },
  {
    connection: redisClient,
  }
);

worker.on("failed", (job, err) => {
  logger.error(`Image upload job failed for job ${job}:`, err);
});
