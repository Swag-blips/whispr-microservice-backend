import { Request, Response } from "express";
import logger from "../utils/logger";
import Auth from "../models/auth.model";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken";
import jwt from "jsonwebtoken";
import { decodeEmailToken } from "../utils/decodeToken";
import crypto from "crypto";
import { sendOtpMail, sendVerificationMail } from "../utils/sendMail";
import redisClient from "../config/redis";
import {
  LoginService,
  registerUser,
  resendOtpService,
  verifyEmailService,
} from "../services/auth.service";

export const register = async (req: Request, res: Response) => {
  logger.info("Registration endpoint hit");
  try {
    const { username, email, password, avatar } = req.body;

    const user = await registerUser(email, password, username, avatar);

    res.status(201).json({
      success: true,
      user: {
        username: username,
        email: user.email,
        isVerified: user.isVerified,
      },
      message: "Account created successfully",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User already exists") {
        res.status(400).json({ success: false, message: error.message });
      } else if (error.message === "Error sending verification mail") {
        res.status(400).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ message: "An error occurred" });
      }
    }
    logger.error(error);
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

    await verifyEmailService(token);

    res.status(200).json({
      success: true,
      message: "Email verified successfully please login",
    });

    return;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid token") {
        res.status(400).json({ success: false, message: error.message });
      } else if (error.message === "Verification link has expired") {
        res.status(410).json({ success: false, message: error.message });
      } else if (error.message === "User already verified") {
        res.status(400).json({ success: false, message: error.message });
      }
    }
    logger.error(error);
    res.status(500).json({ message: error });
  }
};

export const Login = async (req: Request, res: Response) => {
  logger.info("Login endpoint hit");
  try {
    const { email, password } = req.body;

    await LoginService(email, password, redisClient);
    res.status(200).json({
      success: true,
      message: "Login successful please verify OTP",
    });

    return;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "invalid credentials") {
        res.status(400).json({ success: false, message: error.message });
      }
    }
    logger.error(error);
    res.status(500).json({ message: error });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { otp, email } = req.body;

    console.log(otp, email);

    if (!otp || !email) {
      res
        .status(400)
        .json({ success: false, message: "Otp and email is required" });
      return;
    }

    const otpDoc = await redisClient.get(`otp:${email}`);
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
    return;
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

    await resendOtpService(email, redisClient);

    res.status(200).json({ success: true, message: "otp sent to your mail" });
    return;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("An OTP was recently")) {
        res.status(429).json({ success: false, message: error.message });
      }
    }
    logger.error(error);
    res.status(500).json({ message: error });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken, email } = req.body;

  if (!refreshToken || !email) {
    res.status(400).json({
      success: false,
      message: "refresh token and email is required",
    });
    return;
  }
  try {
    const verifiedRefreshToken = jwt.verify(
      refreshToken,
      process.env.JWT_SECRET_KEY as string
    );

    const user = await Auth.findOne({
      email,
    });

    if (!user) {
      res.status(400).json({ success: false, message: "User does not exist" });
      return;
    }

    if (!verifiedRefreshToken) {
      res
        .status(400)
        .json({ success: false, message: "Invalid refresh token" });
      return;
    }

    const accessToken = generateAccessToken(user._id);

    res.status(200).json({ success: true, accessToken });
    return;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json({ success: false, message: "Token has expired" });
        return;
      } else {
        res.status(500).json({ message: error });
        logger.error(error);
        return;
      }
    }
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;

    const userId = req.userId;

    const user = await Auth.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const verifyPassword = await user.comparePassword(newPassword);

    if (verifyPassword) {
      res.status(400).json({
        success: false,
        message: "Old password and new password are the same",
      });

      return;
    }

    user.password = newPassword;
    await user.save();
    res
      .status(201)
      .json({ success: true, message: "Password successfully updated" });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ success: false, error: error });
  }
};
