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

const addMessage = async (
  content: string,
  chatId: Types.ObjectId,
  receiverId: Types.ObjectId,
  userId: Types.ObjectId,
  imagePath?: string,
  status?: string
) => {
  let result: UploadApiResponse | null = null;
  let session: mongoose.mongo.ClientSession | null | undefined = null;

  let tempConnection: typeof mongoose | null = null;
  try {
    if (!connection) {
      tempConnection = await mongoose.connect(
        process.env.MONGODB_URI as string
      );
    }

    if (imagePath) {
      result = await cloudinary.uploader.upload(imagePath, {
        folder: "messages_images",
        public_id: `message_${chatId}_${Date.now()}`,
      });
      logger.info("📸 Image uploaded successfully to Cloudinary");
    }

    session = connection
      ? await connection.startSession()
      : await tempConnection?.startSession();

    await session?.withTransaction(async () => {
      const [message] = await Message.create(
        [
          {
            chatId,
            content,
            receiverId,
            senderId: userId,
            ...(result?.secure_url && { file: result.secure_url }),
            ...(status && { status: "delivered" }),
          },
        ],
        { session }
      );

      if (!message) {
        throw new Error("Failed to create message");
      }

      await Chat.findByIdAndUpdate(
        chatId,
        {
          lastMessage: message.content,
        },
        { session }
      );
    });

    logger.info("✅ Message created and lastMessage updated successfully");
  } catch (error) {
    logger.error("❌ Failed to add message in transaction:", error);
    throw error;
  } finally {
    await session?.endSession();
    tempConnection && (await tempConnection.disconnect());
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
      status?: string;
    };
  }) => {
    try {
      const { content, chatId, receiverId, userId, imagePath, status } =
        job.data;
      await addMessage(content, chatId, receiverId, userId, imagePath, status);
    } catch (error) {
      console.log(error);
      throw error;
    }
  },
  {
    connection: redisClient,
  }
);

worker.on("failed", (job, err) => {
  logger.error(`🚨 Job ${job?.id} failed in add-message queue:`, err);
});
