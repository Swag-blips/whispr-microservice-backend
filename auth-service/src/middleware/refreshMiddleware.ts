import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import logger from "../utils/logger";

interface DecodedUser {
  userId: Types.ObjectId;
}

export const refreshMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    res.status(401).json({ success: false, message: "refresh token Missing" });
    return;
  }

  try {
    const decodedToken = jwt.verify(
      refreshToken,
      process.env.JWT_SECRET_KEY as string
    ) as DecodedUser;

    if (decodedToken) {
      req.userId = decodedToken.userId;
      next();
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json({ success: false, message: "Token has expired" });
        return;
      } else if (error.message === "jwt malformed") {
        res.status(401).json({ success: false, message: "malformed jwt" });
        return;
      } else {
        res.status(500).json({ message: error });
        logger.error(error);
        return;
      }
    }
  }
};
 