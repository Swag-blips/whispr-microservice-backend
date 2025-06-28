import { Types } from "mongoose";

export interface ChatCreatedEvent {
  participants: Array<Types.ObjectId>;
}

export interface MessageType {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  content: string;
  chatId: Types.ObjectId;
  status: "delivered" | "sent" | "seen";
  updatedAt: Date;
}

export interface ChatSchema {
  participants: Array<Types.ObjectId>;
  type: "private" | "group";
  lastMessage: string;
  groupName?: string;
  bio?: string;
  otherUser: any;
  updatedAt: Date;
}

export interface ChatDeletedEvent {
  user1: Types.ObjectId;
  user2: Types.ObjectId;
}

declare module "socket.io" {
  interface Socket {
    userId: Types.ObjectId;
  }
}
