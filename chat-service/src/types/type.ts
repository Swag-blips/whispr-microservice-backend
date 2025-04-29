import { Types } from "mongoose";

export interface ChatCreatedEvent {
  participants: Array<Types.ObjectId>;
}

export interface MessageType {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  content: string;
  chatId: Types.ObjectId;
}

export interface ChatSchema {
  participants: Array<Types.ObjectId>;
  type: ChatType;
  lastMessage: string;
}

enum ChatType {
  private = "private",
  group = "group",
}

declare module "socket.io" {
  interface Socket {
    userId: Types.ObjectId;
  }
}
