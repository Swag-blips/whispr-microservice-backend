import mongoose from "mongoose";
import { MessageType } from "../types/type";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    file: {
      type: String,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
  },
  { timestamps: true }
);

messageSchema.index({ chatId: 1 });
const Message = mongoose.model<MessageType>("Message", messageSchema);

export default Message;
