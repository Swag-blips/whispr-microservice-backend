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
      default: "Not much here yet... This group is fire",
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
