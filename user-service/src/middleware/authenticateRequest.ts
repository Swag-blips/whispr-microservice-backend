import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";
import { Types } from "mongoose";

interface DecodedUser {
  userId: Types.ObjectId;
}

declare global {
  namespace Express {
    interface Request {
      userId?: Types.ObjectId;
    }
  }
}

const authenticateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    let token = req.cookies.accessToken;

    if (!token && authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({ success: false, message: "Access token missing" });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET_KEY;
    if (!jwtSecret) {
      logger.error("JWT_SECRET_KEY is not configured");
      res.status(500).json({ success: false, message: "Server configuration error" });
      return;
    }

    const decodedToken = jwt.verify(token, jwtSecret) as DecodedUser;

    if (decodedToken && decodedToken.userId) {
      req.userId = decodedToken.userId;
      next();
    } else {
      res.status(401).json({ success: false, message: "Invalid token payload" });
      return;
    }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: "Token has expired" });
      return;
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.error("Token verification failed:", error.message);
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    } else if (error instanceof Error) {
      logger.error("Authentication error:", error.message);
      res.status(500).json({ success: false, message: "Authentication failed" });
      return;
    } else {
      logger.error("Unknown authentication error:", error);
      res.status(500).json({ success: false, message: "Authentication failed" });
      return;
    }
  }
};

export default authenticateRequest;