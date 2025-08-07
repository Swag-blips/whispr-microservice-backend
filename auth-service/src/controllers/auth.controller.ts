import { Request, Response } from "express";
import logger from "../utils/logger";
import Auth from "../models/auth.model";
import {
  generateAccessToken,
  generateMailToken,
  generateRefreshToken,
} from "../utils/generateToken";
import redisClient from "../config/redis";
import {
  LoginService,
  registerUser,
  resendOtpService,
  verifyEmailService,
} from "../services/auth.service";
import { publishEvent } from "../config/rabbitMq";
import { queue as emailQueue } from "../utils/emailWorker";

export const register = async (req: Request, res: Response) => {
  logger.info("Registration endpoint hit");
  try {
    const { username, email, password, avatar, bio } = req.body;

    const user = await registerUser(email, password, username, avatar, bio);

    res.status(201).json({
      success: true,
      user: {
        username: username,
        email: user.email,
        isVerified: user.isVerified,
      },
      message: "Account created successfully",
    });

    await redisClient.del(`search:${username}`);

    return;
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
      message: "Email verification successful",
    });

    return;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Invalid or expired verification link") {
        res.status(400).json({ success: false, message: error.message });
        return;
      } else if (error.message === "Verification link has expired") {
        res.status(410).json({ success: false, message: error.message });
        return;
      } else if (error.message === "User already verified") {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const Login = async (req: Request, res: Response) => {
  logger.info("Login endpoint hit");
  try {
    const { email, password } = req.body;

    const login = await LoginService(email, password, redisClient);

    if (login) {
      res.status(200).json({
        success: true,
        message: "Login successful please verify OTP",
      });
    }

    return;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "invalid credentials") {
        res.status(400).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ message: error });
      }
    }
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

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Otp successfully verified",
      data: {
        username: user.username,
      },
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
  const userId = req.userId;
  try {
    const accessToken = generateAccessToken(userId);

    res.cookie("accessToken", accessToken, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });
    res.status(200).json({ success: true });
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

export const signInWithGoogle = async (req: Request, res: Response) => {
  try {
    const code = req.headers.authorization;

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: "http://localhost:3006/auth/callback/google/",
        grant_type: "authorization_code",
        access_type: "offline",
      }),
    });
    const accessToken = await response.json();
    if (!response.ok) {
      const errorDetails = await response.json();
      throw new Error(
        `Token Exchange Failed: ${
          errorDetails.error_description || response.statusText
        }`
      );
    }

    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken.access_token}`,
        },
      }
    );
    if (!userResponse.ok) {
      const errorDetails = await userResponse.json();
      throw new Error(
        `User Info Fetch Failed: ${
          errorDetails.error_description || userResponse.statusText
        }`
      );
    }
    const userDetails = await userResponse.json();

    console.log(userDetails);

    const user = await Auth.findOne({
      email: userDetails.email,
    });

    if (!user) {
      const createdUser = await Auth.create({
        email: userDetails.email,
        isVerified: true,
        providers: ["google"],
      });

      await publishEvent("user.created", {
        _id: createdUser._id,
        email: userDetails.email,
        username: userDetails.name,
        avatar: userDetails.picture,
      });

      const accessToken = generateAccessToken(createdUser._id);
      const refreshToken = generateRefreshToken(createdUser._id);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 15 * 24 * 60 * 60 * 1000,
      });

      res.cookie("accessToken", accessToken, {
        httpOnly: false,
        secure: false,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });
    } else {
      if (!user.providers.includes("google")) {
        user.providers.push("google");
        await user.save();
      }

      const accessToken = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 15 * 24 * 60 * 60 * 1000,
      });

      res.cookie("accessToken", accessToken, {
        httpOnly: false,
        secure: false,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });
    }

    res.status(201).json({
      success: true,
      message: "Authentication successful",
      data: {
        username: user?.username,
      },
    });
    return;
  } catch (error: any) {
    console.error("Error saving code:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await Auth.findOne({
      email,
    }).lean();

    if (!user) {
      res.status(404).json({ success: false, message: "user not found" });
      return;
    }

    if (user.isVerified) {
      res
        .status(400)
        .json({ success: false, message: "email already verified" });
      return;
    }

    const token = generateMailToken(user._id, email);

    await emailQueue.add(
      "send-email",
      {
        email: email,
        token: token,
        username: user.username,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    res.status(200).json({ success: true, message: "Verification email sent" });
    return;
  } catch (error) {
    logger.error(error);
    res.status(200).json({ success: false, message: "Internal server error" });
  }
};
