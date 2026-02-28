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
): void => {
  try {
    const token = req.cookies.accessToken;
    
    if (!token) {
      logger.warn("Access token missing in request");
      res.status(401).json({ success: false, message: "Access token missing" });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET_KEY;
    if (!jwtSecret) {
      logger.error("JWT_SECRET_KEY environment variable is not set");
      res.status(500).json({ success: false, message: "Internal server error" });
      return;
    }

    let decodedToken: DecodedUser;
    try {
      decodedToken = jwt.verify(token, jwtSecret) as DecodedUser;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        logger.warn("Token has expired");
        res.status(401).json({ success: false, message: "Token has expired" });
        return;
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        logger.warn(`Invalid token: ${jwtError.message}`);
        res.status(401).json({ success: false, message: "Invalid token" });
        return;
      }
      throw jwtError;
    }

    if (!decodedToken || !decodedToken.userId) {
      logger.warn("Decoded token missing userId");
      res.status(401).json({ success: false, message: "Invalid token structure" });
      return;
    }

    req.userId = decodedToken.userId;
    logger.info(`User authenticated successfully: ${decodedToken.userId}`);
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ success: false, message: "Authentication failed" });
    return;
  }
};

export default authenticateRequest;