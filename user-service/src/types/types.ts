import { Types } from "mongoose";

export interface EventUser {
  _id: Types.ObjectId;
  email: string;
  username: string;
  bio?: string;
}

export interface IncomingFriendsMessage {
  user1: Types.ObjectId;
  user2: Types.ObjectId;
}
export interface User extends EventUser {
  avatar: string;
}
