import mongoose from "mongoose";
import { AuthPayload } from "../../types/types";
import argon2 from "argon2";
import logger from "../utils/logger";

const authSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      min: 6,
      max: 30,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unqiue: true,
    },
    password: {
      type: String,
      required: true,
      min: 6,
    },
    avatar: {
      type: String,
      default: "",
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

authSchema.pre("save", async function save(next) {
  const schema = this;
  try {
    if (!schema.isModified("password")) {
      return next();
    }

    const hash = await argon2.hash(schema.password);

    return next();
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(error);
      return next(error);
    }
  }
});
const Auth = mongoose.model<AuthPayload>("Auth", authSchema);

export default Auth;
