import mongoose from "mongoose";
import { ChatSchema } from "../types/type";

const chatSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    groupName: {
      type: String,
    },
    bio: {
      type: String,
    },
    type: {
      type: String,
      enum: ["private", "group"],
      default: "private",
    },
    lastMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

chatSchema.index({ participants: 1 });

const Chat = mongoose.model<ChatSchema>("Chat", chatSchema);

export default Chat;
