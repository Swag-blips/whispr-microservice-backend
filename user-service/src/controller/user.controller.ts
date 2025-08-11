import { Request, Response } from "express";
import logger from "../utils/logger";
import User from "../models/user.model";
import redisClient from "../config/redis";
import { queue } from "../utils/imageWorker";
import { connection } from "../config/dbConnect";
import mongoose from "mongoose";
import { invalidatePermissions } from "../utils/fetchPermissions";
import { publishEvent } from "../config/rabbitMq";

export const getUser = async (req: Request, res: Response) => {
  console.log("GET USER ENDPOINT HIT");
  try {
    const username = req.params.username;

    const userId = req.userId;

    if (req.body.length > 0) {
      res.status(400).json({ success: false, message: "body not allowed" });
      return;
    }
    const expiryTime = 5 * 60;
    if (!username) {
      res.status(400).json({ success: false, message: "Username required" });
      return;
    }

    const cachedResult = await redisClient.get(`search:${username}`);

    if (cachedResult) {
      // const filteredCachedResult = JSON.parse(cachedResult).filter(
      //   (user: UserType) => user._id !== userId
      // );
      console.log("CACHE HIT");
      res
        .status(200)
        .json({ success: true, results: JSON.parse(cachedResult) });
      return;
    }

    const results = await User.find(
      { $text: { $search: username } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10)
      .lean()
      .select("-email");

    const filteredResults = results.filter(
      (user) => user._id.toString() !== userId.toString()
    );

    res.status(200).json({ success: true, results: filteredResults });

    if (filteredResults.length > 0) {
      await redisClient.set(
        `search:${username}`,
        JSON.stringify(filteredResults),
        "EX",
        expiryTime
      );
    }

    return;
  } catch (error) {
    console.error(error);
    logger.error("An error occured in the getUser controller", error);
    res.status(500).json({ message: error });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  logger.info("Get current user endpoint hit");
  try {
    const userId = req.userId;

    const cachedUser = await redisClient.get(`user:${userId}`);

    if (cachedUser) {
      res
        .status(200)
        .json({ success: true, currentUser: JSON.parse(cachedUser) });
      return;
    }

    const currentUser = await User.findById(userId);

    if (!currentUser) {
      res.status(404).json({ success: false, message: "user not found" });
      return;
    }

    await redisClient.set(`user:${userId}`, JSON.stringify(currentUser));

    res.status(200).json({ success: true, currentUser });
    return;
  } catch (error) {
    logger.error("An error occured in the getCurrentUser controller", error);
    res.status(500).json({ message: error });
  }
};

export const updateUserInfo = async (req: Request, res: Response) => {
  try {
    const { username, bio, avatar } = req.body;
    const userId = req.userId;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      res.status(404).json({ success: false, message: "user not found" });
      return;
    }

    if (avatar) {
      queue.add(
        "upload-avatar",
        { imagePath: avatar, userId },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 3000,
          },
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
    }

    currentUser.username = username || currentUser.username;
    currentUser.bio = bio || currentUser.bio;

    await currentUser.save();

    res
      .status(201)
      .json({ success: false, message: "Profile updated successfully" });
    return;
  } catch (error) {
    logger.error("An error occured in the getCurrentUser controller", error);
    res.status(500).json({ message: error });
  }
};

let session: mongoose.mongo.ClientSession | undefined;

export const removeFriend = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { friendId } = req.body;

    session = await connection?.startSession();

    if (userId === friendId) {
      res
        .status(400)
        .json({ success: false, message: "Cannot unfriend yourself" });
      return;
    }

    const transaction = await session?.withTransaction(async () => {
      await User.findByIdAndUpdate(
        userId,
        {
          $pull: { friends: friendId },
        },
        { session }
      );

      await User.findByIdAndUpdate(
        friendId,
        {
          $pull: { friends: userId },
        },
        { session }
      );
    });

    logger.info("TRANSACTION COMPLETE");
    await invalidatePermissions(userId);
    await invalidatePermissions(friendId);

    publishEvent("chat.deleted", {
      user1: userId,
      user2: friendId,
    });

    res
      .status(200)
      .json({ success: true, message: "friend removed sucessfully" });
    return;
  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    await session?.endSession();
  }
};

export const getFriends = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).lean();

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (!user.friends.length) {
      res.status(200).json({ success: true, friends: [] });
      return;
    }

    const friends = await Promise.all(
      user.friends.map(async (friend) => {
        const friendDetails = await User.findById(friend)
          .lean()
          .select("username avatar _id bio");

        return {
          ...friendDetails,
        };
      })
    );

    res.status(200).json({ success: true, friends });
    return;
  } catch (error) {
    res.status(500).json({ success: false, error: error });
    logger.error(error);
  }
};
