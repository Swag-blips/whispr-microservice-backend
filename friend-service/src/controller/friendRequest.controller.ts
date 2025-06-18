import { Request, Response } from "express";
import logger from "../utils/logger";
import FriendRequest from "../models/friendRequest.model";
import { publishEvent } from "../config/rabbitMq";

export const sendFriendRequest = async (req: Request, res: Response) => {
  logger.info("send friend request endpoint hit");
  try {
    const { receiverId } = req.body;
    console.log("REQUEST BODY", receiverId);
    const senderId = req.userId;

    if (!receiverId) {
      res
        .status(400)
        .json({ success: false, message: "Receiver ID is required" });
      return;
    }

    if (receiverId === senderId) {
      res.status(400).json({
        success: false,
        message: "You cant send a request to yourself",
      });

      return;
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: receiverId, to: senderId },
        { from: senderId, to: receiverId },
      ],
    });

    if (existingRequest) {
      logger.error("Attempted duplicate friend request");
      res.status(400).json({
        success: false,
        message:
          "You’ve already sent a request or received one, no need to resend",
      });
      return;
    }

    await FriendRequest.create({
      from: senderId,
      to: receiverId,
    });

    // TODO publish to notification service
    await publishEvent("friendRequest.created", {
      from: senderId,
      to: receiverId,
    });

    res
      .status(201)
      .json({ success: true, message: "Friend request sent successfully" });
    return;
  } catch (error) {
    logger.error(error);

    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        details: error.message,
      });
    }
  }
};

export const acceptFriendRequest = async (req: Request, res: Response) => {
  try {
    const { senderId } = req.body;

    if (!senderId) {
      res.status(400).json({ success: false, message: "SenderId required" });
      return;
    }

    const receiverId = req.userId;

    const existingRequest = await FriendRequest.findOne({
      from: senderId,
      to: receiverId,
    });

    if (!existingRequest) {
      res
        .status(400)
        .json({ success: false, message: "Friend request does not exist" });

      return;
    }
    if (existingRequest.status === "Accepted") {
      res
        .status(400)
        .json({ success: false, message: "Friend already accepted" });
      return;
    }
    await publishEvent("friends.accept.created", {
      user1: senderId,
      user2: receiverId,
    });

    await publishEvent("chat.created", {
      participants: [senderId, receiverId],
    });

    await publishEvent("friendRequest.accepted", {
      from: senderId,
      to: receiverId,
    });

    existingRequest.status = "Accepted";
    await existingRequest.save();
    res.status(201).json({ success: true, message: "Friend request accepted" });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error });
  }
};

export const declineFriendRequest = async (req: Request, res: Response) => {
  try {
    const friendRequestId = req.params.id;

    if (!friendRequestId) {
      res
        .status(400)
        .json({ success: false, message: "Friend request id required" });

      return;
    }

    const friendRequest = await FriendRequest.findById(friendRequestId);

    if (!friendRequest) {
      res
        .status(400)
        .json({ success: false, message: "Friend request not found" });

      return;
    }

    friendRequest.status = "Declined";
    await friendRequest.save();

    await publishEvent("friendRequest.declined", {
      from: friendRequest.from,
      to: friendRequest.to,
    });

    res
      .status(200)
      .json({ success: true, message: "Friend request declined " });

    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
