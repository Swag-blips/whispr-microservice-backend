import { Request, Response } from "express";
import { validateRegistration } from "../utils/validate";
import logger from "../utils/logger";
import Auth from "../models/auth.model";

export const register = async (req: Request, res: Response) => {
  logger.info("Registration endpoint");
  try {
    const { username, email, password, avatar } = req.body;

    const exisitingUser = await Auth.findOne({ email });

    if (exisitingUser) {
      res.status(401).json({ success: false, message: "User already exists" });
      return;
    }

    const user = new Auth({
      username,
      password,
      email,
      avatar,
    });

    await user.save();

    res.status(201).json({
      success: true,
      user: {
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });

    return;
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error });
    return;
  }
};
