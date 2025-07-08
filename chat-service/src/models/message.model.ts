import mongoose from "mongoose";
import { MessageType } from "../types/type";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    file: {
      type: String,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    receivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    content: {
      type: String,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true, 
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
    },

    messageType: {
      type: String,
      enum: ["text", "file", "system"],
      default: "text",
    },
  
    systemAction: {
      type: String,
      enum: ["user_removed", "user_added", "left_group", "group_renamed", "user_promoted"],
    },
   
    meta: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

messageSchema.index({ chatId: 1 });
messageSchema.index({ receiverId: 1 });
const Message = mongoose.model<MessageType>("Message", messageSchema);

export default Message;
