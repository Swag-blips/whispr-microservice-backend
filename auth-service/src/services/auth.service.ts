import { Response } from "express";
import Auth from "../models/auth.model";
import { sendVerificationMail } from "../utils/sendMail";
import { generateMailToken } from "../utils/generateToken";
import { queue } from "../utils/imageWorker";
import { publishEvent } from "../config/rabbitMq";
import logger from "../utils/logger";
export const registerUser = async (
  email: string,
  password: string,
  username: string,
  avatar?: string
) => {
  try {
    const existingUser = await Auth.findOne({ email });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const user = new Auth({
      password,
      email,
      isVerified: false,
    });

    const token = generateMailToken(user._id, email);
    const verificationEmail = sendVerificationMail(email, username, token);

    if (!verificationEmail) {
      throw new Error("Error sending verification mail");
    }

    await user.save();

    if (avatar) {
      await queue.add(
        "avatar-upload",
        { imagePath: avatar, userId: user._id },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 3000 },
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
    }

    await publishEvent("user.created", { _id: user._id, username, email });

    return user;
  } catch (error) {
    logger.error(error);
    throw error; // Propagate error for controller to handle
  }
};
