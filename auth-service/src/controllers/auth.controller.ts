import { Request, Response } from "express";
import { validateRegistration } from "../utils/validate";
import logger from "../utils/logger";
import Auth from "../models/auth.model";

export const register = async (req: Request, res: Response) => {
  logger.info("Registration endpoint");
  try {
    const { username, email, password, avatar } = req.body;

    const error = validateRegistration(req.body);

    if (error) {
      logger.warn(error.error?.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.error?.details[0].message,
      });
    }

    const exisitingUser = await Auth.findOne({ email });

    if (exisitingUser) {
      return res
        .status(401)
        .json({ success: false, message: "User already exists" });
    }

    const user = new Auth({
      username,
      password,
      email,
      avatar,
    });

    await user.save();

    return res.status(201).json({
      success: true,
      user: {
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error });
  }
};
