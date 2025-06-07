import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import logger from "./logger";

export interface JwtPayload {
  userId: Types.ObjectId;
  exp: number;
  email: string;
}
export const decodeEmailToken = (token: string) => {
  try {
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET_KEY as string
    ) as JwtPayload;

    if (!decodedToken) {
      return;
    }

    return decodedToken;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      logger.error("JWT token has expired");
    } else if (error.name === "JsonWebTokenError") {
      logger.error("Invalid JWT token");
    } else if (error.name === "NotBeforeError") {
      logger.error("JWT token not active yet");
    } else {
      logger.error("Unexpected error decoding JWT token:", error);
    }
    return undefined;
  }
};
