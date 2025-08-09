import mongoose from "mongoose";
import { connection } from "../config/dbConnect";
import User from "../models/user.model";
import {
  IncomingFriendsMessage,
  IncomingProfilePic,
  IncomingUserMessage,
} from "../types/types";
import logger from "../utils/logger";
import { getAvatarImage } from "../utils/getRandomImage";

export const handleCreateUser = async (user: IncomingUserMessage) => {
  const altAvatar = getAvatarImage();
  try {
    await User.create({
      _id: user._id,
      email: user.email,
      username: user.username,
      ...(user.bio && { bio: user.bio }),
      avatar: user.avatar || altAvatar,
    });

    logger.info("User successfully created");
  } catch (error) {
    logger.error(error);
  }
};

let session: mongoose.mongo.ClientSession | undefined;
export const handleAddFriends = async (content: IncomingFriendsMessage) => {
  try {
    const { user1, user2 } = content;
    session = await connection?.startSession();

    await session?.withTransaction(async () => {
      await User.findByIdAndUpdate(
        user1,
        {
          $push: { friends: user2 },
        },
        { session }
      );

      await User.findByIdAndUpdate(
        user2,
        {
          $push: { friends: user1 },
        },
        { session }
      );
    });
  } catch (error) {
    logger.error("Transaction failed", error);
  } finally {
    await session?.endSession();
  }
};

export const handleSaveAvatar = async (content: IncomingProfilePic) => {
  try {
    const { userId, result } = content;

    const user = await User.findByIdAndUpdate(userId, {
      avatar: result,
    });
    logger.info("image saved successfully");
  } catch (error) {
    logger.error(error);
  }
};
