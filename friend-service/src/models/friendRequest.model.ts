import mongoose from "mongoose";
import { FriendRequest } from "../types/types";

const friendRequestSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

const FriendRequest = mongoose.model<FriendRequest>(
  "FriendRequest",
  friendRequestSchema
);

export default FriendRequest;
