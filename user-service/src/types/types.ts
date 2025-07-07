import { Types } from "mongoose";

export interface IncomingUserMessage {
  _id: Types.ObjectId;
  email: string;
  username: string;
  bio?: string;
  avatar?: string;
}

export interface IncomingFriendsMessage {
  user1: Types.ObjectId;
  user2: Types.ObjectId;
}
export interface User extends IncomingUserMessage {
  avatar: string;
  friends: Array<Types.ObjectId>;
}

export interface IncomingProfilePic {
  userId: Types.ObjectId;
  result: string;
}
