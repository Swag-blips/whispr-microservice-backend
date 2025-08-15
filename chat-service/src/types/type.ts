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
  messageType?: "text" | "file" | "system";
  systemAction?:
    | "user_removed"
    | "user_added"
    | "left_group"
    | "group_renamed"
    | "user_promoted";
  meta?: Record<string, any>;
  fileType?: string;
}

export interface ChatSchema {
  adminId?: Types.ObjectId;
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
