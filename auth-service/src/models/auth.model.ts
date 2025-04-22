import mongoose, { Model } from "mongoose";
import { AuthUser } from "../types/types";
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
      unique: true,
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

  if (schema.isModified("password")) {
    try {
      schema.password = await argon2.hash(schema.password);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error);
        next(error);
      }
    }
  }

  return next();
});

authSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  try {
    return argon2.verify(this.password, candidatePassword);
  } catch (error) {
    throw error;
  }
};
const Auth = mongoose.model<AuthUser>("Auth", authSchema);

export default Auth;
