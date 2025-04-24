import mongoose from "mongoose";

import { Types } from "mongoose";

export interface AuthUser extends mongoose.Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  isVerified: boolean;
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

export interface Otp extends mongoose.Document {
  userId: Types.ObjectId;
  otp: string;
  expiryTime: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  compareOtp: (candidateOtp: string) => Promise<boolean>;
}
