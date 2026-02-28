import mongoose from "mongoose";
import { FriendRequest } from "../types/types";

const friendRequestSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Declined"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

friendRequestSchema.pre("save", async function (next) {
  if (this.isNew) {
    if (this.from.equals(this.to)) {
      throw new Error("Cannot send friend request to yourself");
    }

    const existingRequest = await mongoose.model("FriendRequest").findOne({
      $or: [
        { from: this.from, to: this.to },
        { from: this.to, to: this.from }
      ]
    });

    if (existingRequest) {
      throw new Error("Friend request already exists between these users");
    }
  }

  next();
});

const FriendRequest = mongoose.model<FriendRequest>(
  "FriendRequest",
  friendRequestSchema
);

export default FriendRequest;