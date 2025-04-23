import mongoose from "mongoose";
import { User } from "../types/types";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    default: "Not much here yet... but trust me, I’m interesting.",
  },
  avatar: {
    type: String,
    default: "",
  },
});

const User = mongoose.model<User>("User", userSchema);

export default User;
