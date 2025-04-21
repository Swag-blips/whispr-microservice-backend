import mongoose from "mongoose";
import { Otp } from "../../types/types";
import argon2 from "argon2";
import logger from "../utils/logger";

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      expires: "5m",
      default: Date.now(),
    },

    expiryTime: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

otpSchema.index({ userId: "text", otp: "text" });

otpSchema.pre("save", async function hashOtp(next) {
  try {
    const schema = this;
    if (schema.isModified("otp")) {
      const modifiedOtp = await argon2.hash(schema.otp);
      schema.otp = modifiedOtp;
    }
  } catch (error) {
    if (error instanceof Error) {
      next(error);
    }
    logger.error(error);
  }
});

const Otp = mongoose.model<Otp>("Otp", otpSchema);

export default Otp;
