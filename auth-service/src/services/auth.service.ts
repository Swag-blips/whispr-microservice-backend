import Auth from "../models/auth.model";
import { generateMailToken } from "../utils/generateToken";
import { queue } from "../utils/imageWorker";
import { queue as emailQueue } from "../utils/emailWorker";
import { publishEvent } from "../config/rabbitMq";
import logger from "../utils/logger";
import { decodeEmailToken } from "../utils/decodeToken";
import crypto from "crypto";
import redisClient from "../config/redis";
import { sendOtpMail } from "../utils/sendMail";
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

    await emailQueue.add(
      "send-email",
      {
        email: email,
        username: username,
        token: token,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

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

export const verifyEmailService = async (token: string) => {
  try {
    const decodedToken = decodeEmailToken(token);
    if (!decodedToken) {
      throw new Error("invalid token");
    }

    const { userId, exp, email } = decodedToken;

    if (Date.now() >= exp * 1000) {
      throw new Error("Verification link has expired");
    }
    await Auth.findByIdAndUpdate(
      userId,
      {
        isVerified: true,
      },
      { new: true }
    );

    return;
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

export const LoginService = async (email: string, password: string) => {
  try {
    const user = await Auth.findOne({ email });

    if (!user) {
      throw new Error("invalid credentials");
    }

    const isValid = await user.comparePassword(password);
    const generatedOtp = crypto.randomInt(100000, 999999);
    const expiryTime = 5 * 60;

    if (isValid) {
      await redisClient.set(
        `otp:${user.email}`,
        generatedOtp,
        "EX",
        expiryTime
      );

      await sendOtpMail(user.email, generatedOtp);
    } else {
      throw new Error("invalid credentials");
    }

    return;
  } catch (error) {
    logger.error(error);
    throw error;
  }
};
