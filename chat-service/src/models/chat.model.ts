import mongoose from "mongoose";
import { ChatSchema } from "../types/type";

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
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

const Chat = mongoose.model<ChatSchema>("Chat", chatSchema);

export default Chat;
