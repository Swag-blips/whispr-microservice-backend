import mongoose from "mongoose";

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
    type: {
      type: String,
      enums: ["Accepted", "Pending", "Message", "Declined"],
    },
  },
  { timestamps: true }
);

notificationSchema.index({ from: 1 });
notificationSchema.index({ to: 1 });
const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
