import Auth from "../models/auth.model";
import { generateMailToken } from "../utils/generateToken";
import { queue } from "../utils/imageWorker";
import { queue as emailQueue } from "../utils/emailWorker";
import { publishEvent } from "../config/rabbitMq";
import logger from "../utils/logger";
import { decodeEmailToken } from "../utils/decodeToken";
import crypto from "crypto";
import { sendOtpMail } from "../utils/sendMail";
import Redis from "ioredis";

export const registerUser = async (
  email: string,
  password: string,
  username: string,
  redisClient: Redis,
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
    throw error;
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

    const user = await Auth.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isVerified) {
      throw new Error("User already verified");
    }

    await user.save();

    return;
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

export const LoginService = async (
  email: string,
  password: string,
  redisClient: Redis
) => {
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

export const resendOtpService = async (email: string, redisClient: Redis) => {
  try {
    const exisitingOtp = await redisClient.get(`otp:${email}`);

    if (exisitingOtp) {
      const ttl = await redisClient.ttl(`otp:${email}`);

      throw new Error(
        `An OTP was recently sent. Please wait ${ttl} seconds before retrying.`
      );
    }
    const generatedOtp = crypto.randomInt(100000, 999999);
    const expiryTime = 5 * 60;

    const otp = await redisClient.set(
      `otp:${email}`,
      generatedOtp,
      "EX",
      expiryTime
    );

    if (otp === "OK") {
      await sendOtpMail(email, generatedOtp);
    }
    return;
  } catch (error) {
    logger.error(error);
    throw error;
  }
};
