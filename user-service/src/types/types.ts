import { Types } from "mongoose";

export interface EventUser {
  _id: Types.ObjectId;
  email: string;
  username: string;
  bio?: string;
}

export interface User extends EventUser {
  avatar: string;
}
