import { Request, Response } from "express";
import logger from "../utils/logger";
import Auth from "../models/auth.model";
import { generateMailToken } from "../utils/generateToken";
import sendMail from "../utils/sendMail";

export const register = async (req: Request, res: Response) => {
  logger.info("Registration endpoint");
  try {
    const { username, email, password, avatar } = req.body;

    const exisitingUser = await Auth.findOne({
      $or: [{ email }, { username }],
    });

    if (exisitingUser) {
      res.status(401).json({ success: false, message: "User already exists" });
      return;
    }

    const user = new Auth({
      username,
      password,
      email,
      avatar,
      isVerified: false,
    });

    const token = generateMailToken(user._id, email);

    sendMail(email, username, token);
    await user.save();

    res.status(201).json({
      success: true,
      user: {
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isVerified: user.isVerified,
      },
    });

    return;
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error });
    return;
  }
};
