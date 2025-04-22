import { Request, Response } from "express";
import logger from "../utils/logger";
import Auth from "../models/auth.model";
import {
  generateAccessToken,
  generateMailToken,
  generateRefreshToken,
} from "../utils/generateToken";
import { decodeEmailToken } from "../utils/decodeToken";
import crypto from "crypto";
import { sendOtpMail, sendVerificationMail } from "../utils/sendMail";
import redisClient from "../config/redis";

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

    sendVerificationMail(email, username, token);
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
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      res
        .status(400)
        .json({ success: false, message: "Token required to verify email" });
      return;
    }

    const { userId, exp, email } = decodeEmailToken(token);

    if (Date.now() >= exp * 1000) {
      res
        .status(410)
        .json({ success: false, message: "Verification link has expired" });
      return;
    }
    await Auth.findByIdAndUpdate(userId, {
      isVerified: true,
    });

    res.status(200).json({
      success: true,
      message: "Email verified successfully please login",
    });

    return;
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error });
  }
};

export const Login = async (req: Request, res: Response) => {
  logger.info("Login endpoint hit");
  try {
    const { username, password } = req.body;

    const user = await Auth.findOne({ username });

    if (!user) {
      res.status(400).json({ success: false, message: "invalid credentials" });
      return;
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
      res.status(200).json({
        success: true,
        message: "Login successful please verify OTP",
      });
    } else {
      res.status(400).json({ success: false, message: "invalid credentials" });
      return;
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { otp, email } = req.body;

    if (!otp || !email) {
      res
        .status(400)
        .json({ success: false, message: "Otp and email is required" });
      return;
    }

    const otpDoc = await redisClient.get(`otp:${email}`);
    logger.info("otp document", otpDoc);
    if (!otpDoc) {
      res.status(400).json({ success: false, message: "Expired Otp" });
      return;
    }

    if (otpDoc !== otp) {
      res.status(400).json({ success: false, message: "Invalid OTP" });
      return;
    }

    const user = await Auth.findOne({ email });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    await redisClient.del(`otp:${email}`);
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      message: "Otp successfully verified",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error });
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res
        .status(400)
        .json({ success: false, message: "Email is required to send otp" });
      return;
    }

    const exisitingOtp = await redisClient.get(`otp:${email}`);

    if (exisitingOtp) {
      const ttl = await redisClient.ttl(`otp:${email}`);
      res.status(429).json({
        success: false,
        message: `An OTP was recently sent. Please wait ${ttl} seconds before retrying.`,
      });
      return;
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

    res.status(200).json({ success: true, message: "otp sent to your mail" });
    return;
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: error });
  }
};
