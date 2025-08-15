import { Queue, Worker } from "bullmq";
import redisClient from "../config/redis";
import Message from "../models/message.model";
import { UploadApiResponse } from "cloudinary";
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
  userId: Types.ObjectId,
  receiverId?: Types.ObjectId,
  receivers?: Array<Types.ObjectId>,
  imagePath?: string,
  status?: string,
  fileType?: string,
  fileName?: string
) => {
  let session: mongoose.mongo.ClientSession | null | undefined = null;
  let tempConnection: typeof mongoose | null = null;

  console.log("USERID", userId, "RECEIVERID", receiverId);
  try {
    if (!connection) {
      tempConnection = await mongoose.connect(
        process.env.MONGODB_URI as string
      );
    }

    session = connection
      ? await connection.startSession()
      : await tempConnection?.startSession();

    await session?.withTransaction(async () => {
      const [message] = await Message.create(
        [
          {
            chatId,
            ...(content && { content }),
            ...(receiverId && { receiverId }),
            ...(receivers?.length && { receivers }),
            ...(fileType && { fileType }),
            senderId: userId,
            ...(imagePath && { file: imagePath }),
            ...(status && { status: status }),
            ...(fileName && { fileName }),
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

    const deleted = await Promise.all([
      redisClient.del(`userChats:${userId}`),
      redisClient.del(`userChats:${receiverId}`),
    ]);
    console.log("DELETED", deleted);

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
      receivers: Array<Types.ObjectId>;
      userId: Types.ObjectId;
      imagePath?: string;
      status?: string;
      fileType?: string;
      fileName?: string;
    };
  }) => {
    try {
      const {
        content,
        chatId,
        receiverId,
        userId,
        imagePath,
        receivers,
        status,
        fileName,
        fileType,
      } = job.data;
      await addMessage(
        content,
        chatId,
        userId,
        receiverId,
        receivers,
        imagePath,
        status,
        fileType,
        fileName
      );
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
