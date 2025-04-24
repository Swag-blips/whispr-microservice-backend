import { Request, Response } from "express";
import logger from "../utils/logger";
import User from "../model/user.model";
import redisClient from "../config/redis";
export const getUser = async (req: Request, res: Response) => {
  logger.info("get user endpoint hit");
  try {
    const username = req.params.username;
    const expiryTime = 5 * 60;
    if (!username) {
      res.status(400).json({ success: false, message: "Username required" });
      return;
    }

    const cachedResult = await redisClient.get(`search:${username}`);

    if (cachedResult) {
      res
        .status(200)
        .json({ success: true, cachedResult: JSON.parse(cachedResult) });
      return;
    }

    const results = await User.find(
      { $text: { $search: username } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10)
      .lean();

    res.status(200).json({ success: true, results });
    await redisClient.set(
      `search:${username}`,
      JSON.stringify(results),
      "EX",
      expiryTime
    );
    return;
  } catch (error) {
    logger.error("An error occured in the getUser controller", error);
    res.status(500).json({ message: error });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  logger.info("Get current user endpoint hit");
  try {
    const userId = req.userId;

    logger.info(userId);

    const currentUser = await User.findById(userId);

    if (!currentUser) {
      res.status(404).json({ success: false, message: "user not found" });
      return;
    }

    res.status(200).json({ success: false, currentUser });
    return;
  } catch (error) {
    logger.error("An error occured in the getCurrentUser controller", error);
    res.status(500).json({ message: error });
  }
};
