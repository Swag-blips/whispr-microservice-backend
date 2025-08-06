import mongoose, { Model } from "mongoose";
import { AuthUser } from "../types/types";
import argon2 from "argon2";
import logger from "../utils/logger";

const authSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,

      min: 6,
    },
    isVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    providers: [
      { 
        type: String,
        enum: ["email/password", "google"],
      },
    ],
  },   
  { timestamps: true } 
); 

authSchema.index({ email: "text" }); 
 
authSchema.pre("save", async function save(next) {
  const schema = this;

  if (schema.isModified("password") && schema.password) {
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
