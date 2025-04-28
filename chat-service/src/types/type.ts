import { Types } from "mongoose";

export interface ChatCreatedEvent {
  participants: Array<Types.ObjectId>;
}


export interface ChatSchema {
  participants: Array<Types.ObjectId>;
  type: ChatType;
  lastMessage: string;
  messages: Array<Types.ObjectId>;
}

enum ChatType {
  private = "private",
  group = "group",
}
