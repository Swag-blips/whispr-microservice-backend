import mongoose from "mongoose";
import { connection } from "../config/dbConnect";
import User from "../model/user.model";
import { EventUser, IncomingFriendsMessage } from "../types/types";
import logger from "../utils/logger";

export const handleCreatedUser = async (user: EventUser) => {
  try {
    await User.create({
      _id: user._id,
      email: user.email,
      username: user.username,
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
