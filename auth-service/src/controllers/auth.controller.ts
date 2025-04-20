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
import Otp from "../models/otp.model";

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
        .json({ suucess: false, message: "Token required to verify email" });
      return;
    }

    const { userId, exp, email } = decodeEmailToken(token);

    if (Date.now() >= exp * 1000) {
      res
        .status(401)
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
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);

    if (isValid) {
      const otp = await Otp.create({
        userId: user._id,
        otp: generatedOtp,
        expiresAt: expiryTime,
      });

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
