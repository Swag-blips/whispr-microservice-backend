import { Types } from "mongoose";

export interface Notification {
  from: Types.ObjectId;
  to: Types.ObjectId
}
