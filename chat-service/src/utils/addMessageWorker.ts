import { Queue, Worker } from "bullmq";
import redisClient from "../config/redis";
import Message from "../models/message.model";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import logger from "./logger";
import mongoose, { Types } from "mongoose";
import { connection } from "../config/dbConnect";
import Chat from "../models/chat.model";

export const queue = new Queue("add-message", {
  connection: redisClient,
});

let session: mongoose.mongo.ClientSession | undefined;
const addMessage = async (
  content: string,
  chatId: Types.ObjectId,
  receiverId: Types.ObjectId,
  userId: Types.ObjectId,
  imagePath?: string
) => {
  let result: UploadApiResponse | null;
  try {
    if (!connection) {
      await mongoose.connect(process.env.MONGODB_URI as string);
    }

    if (imagePath) {
      result = await cloudinary.uploader.upload(imagePath, {
        folder: "messages_images",
        public_id: `message_${chatId}`,
      });

      logger.info("image uploaded successfully");
    }

    session = await connection?.startSession();

    await session?.withTransaction(async () => {
      await Message.create(
        {
          chatId,
          content,
          receiverId,
          senderId: userId,
          ...(result?.secure_url && {
            file: result.secure_url,
          }),
        },
        { session }
      );

      await Chat.findByIdAndUpdate(
        chatId,
        {
          lastMessage: content,
        },
        { session }
      );
    });

    logger.info("Message added and updated successfully");
    return;
  } catch (error) {
    logger.error(error);
    throw error;
  } finally {
    await session?.endSession();
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
      imagePath?: string;
    };
  }) => {
    const { content, chatId, receiverId, userId, imagePath } = job.data;
    await addMessage(content, chatId, receiverId, userId, imagePath);
  },
  {
    connection: redisClient,
  }
);

worker.on("failed", (job, err) => {
  logger.error(`add message job failed for ${job?.id}:`, err);
});
