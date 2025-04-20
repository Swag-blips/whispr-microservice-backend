import mongoose from "mongoose";
import { AuthPayload } from "../../types/types";

const authSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      min: 6,
      max: 30,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      min: 6,
    },
    avatar: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true }
);

authSchema.index({ username: "text", email: "text" });

const Auth = mongoose.model<AuthPayload>("Auth", authSchema);

export default Auth;
