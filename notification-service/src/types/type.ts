import { Types } from "mongoose";

export interface NotificationInterface {
  from: Types.ObjectId;
  to: Types.ObjectId;
  read: boolean;
  type: "Accepted" | "Pending" | "Declined";
}
