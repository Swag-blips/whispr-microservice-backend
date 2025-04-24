import { Request, Response } from "express";
import logger from "../utils/logger";
import User from "../model/user.model";

export const getUser = async (req: Request, res: Response) => {
  logger.info("get user endpoint hit");
  try {
    const username = req.params.username;
    logger.info(username);

    if (!username) {
      res.status(400).json({ success: false, message: "Username required" });
      return;
    }

    const user = await User.findOne({ username });

    if (!user) {
      res.status(404).json({ success: false, message: "User does not exist" });
      return;
    }

    res.status(200).json({ success: true, user: user });
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
