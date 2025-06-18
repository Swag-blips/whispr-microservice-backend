import mongoose from "mongoose";
import { User } from "../types/types";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
    },
    username: {
      type: String,
    },
    bio: {
      type: String,
      default: "Not much here yet... but trust me, I’m interesting.",
    },
    avatar: {
      type: String,
      default: "",
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
  },
  { timestamps: true }
);

userSchema.index({ username: "text" });
const User = mongoose.model<User>("User", userSchema);
User.createIndexes();

export default User;
