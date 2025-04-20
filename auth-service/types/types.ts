import mongoose from "mongoose";
import { Types } from "mongoose";

export interface AuthUser extends mongoose.Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  isVerified: boolean;
  avatar: string | null;
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}
