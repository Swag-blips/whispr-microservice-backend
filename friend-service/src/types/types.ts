import { Types } from "mongoose";

export interface FriendRequest {
  from: Types.ObjectId;
  to: Types.ObjectId;
}
