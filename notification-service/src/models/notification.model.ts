import mongoose from "mongoose";
import { NotificationInterface } from "../types/type";

const notificationSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    read: {
      type: Boolean,
      default: false,
      required: true,
    },

    type: {
      type: String,
      enums: ["Accepted", "Pending", "Message", "Declined"],
    },
  },
  { timestamps: true }
);

notificationSchema.index({ from: 1 });
notificationSchema.index({ to: 1 });
const Notification = mongoose.model<NotificationInterface>("Notification", notificationSchema);

export default Notification;
