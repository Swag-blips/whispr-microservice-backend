import { NextFunction, Request, Response } from "express";

import jwt from "jsonwebtoken";
import logger from "../utils/logger";
import { Types } from "mongoose";
import { getCookie } from "../utils/getCookie";

export interface DecodedUser {
  userId: Types.ObjectId;
}

const authenticateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = getCookie(req)
      ?.find((cookie) => cookie.startsWith("accessToken"))
      ?.slice(12);

    if (!token) {
      res.status(401).json({ success: false, message: "Access token Missing" });
      return;
    }

    const decodedToken = jwt.verify(
      token,
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
      } else {
        res.status(500).json({ message: error });
        logger.error(error);
        return;
      }
    }
  }
};

export default authenticateRequest;
