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
    const decodedToken = jwt.decode(token) as JwtPayload;

    if (!decodedToken) {
      return;
    }

    return decodedToken;
  } catch (error) {
    logger.error(error);
  }
};
