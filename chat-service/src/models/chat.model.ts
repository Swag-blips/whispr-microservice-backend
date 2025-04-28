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
    type: {
      type: String,
      enum: ["private", "group"],
      default: "private",
    },
    lastMessage: {
      type: String,
      default: "",
    },
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Messages",
        default: [],
      },
    ],
  },
  { timestamps: true }
);

const Chat = mongoose.model<ChatSchema>("Chat", chatSchema);

export default Chat;
