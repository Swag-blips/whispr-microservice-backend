import mongoose, { Types } from "mongoose";
import logger from "./logger";

import redisClient from "../config/redis";

export const invalidatePermissions = async (userId: Types.ObjectId) => {
  try {
    await redisClient.del(`permittedChats${userId}`);
    logger.info("user permissions deleted successfully");
  } catch (error) {
    logger.error(`An error occured invalidating permissions ${error}`);
  }
};
