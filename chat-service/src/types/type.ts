import { Types } from "mongoose";

export interface ChatCreatedEvent {
  participants: Array<Types.ObjectId>;
}
