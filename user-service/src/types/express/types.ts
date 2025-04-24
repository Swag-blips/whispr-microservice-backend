import { Types } from "mongoose";

declare global {
  namespace Express {
    export interface Request {
      userId: Types.ObjectId;
    }
  }
}
