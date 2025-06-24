import { Types } from "mongoose";
import Message from "../models/message.model";
import { io } from "../socket/socket";

export const updateMessagesToDelivered = async (userId: Types.ObjectId) => {
  try {
    const messages = await Message.find({
      receiverId: userId,
      status: "sent",
    }).select("_id chatId");

    if (!messages.length) return;

    const groupedByChat: Record<string, string[]> = {};

    for (const msg of messages) {
      const chatId = msg.chatId.toString();

      if (!groupedByChat[chatId]) {
        groupedByChat[chatId] = [];
      }
      groupedByChat[chatId].push(msg._id.toString());
    }

    await Message.updateMany(
      {
        receiverId: userId,
        status: "sent",
      },
      {
        $set: { status: "delivered" },
      }
    );
    Object.entries(groupedByChat).forEach(([chatId, messageIds]) => {
      io.to(chatId).emit("messagesDelivered", {
        chatId,
        messageIds,
      });
    });
  } catch (error) {
    console.error("Failed to update messages to delivered:", error);
  }
};
