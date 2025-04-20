import jwt from "jsonwebtoken";
import { Types } from "mongoose";

export const generateAccessToken = (
  userId: Types.ObjectId,
  email: string
) => {};

export const generateMailToken = (userId: Types.ObjectId) => {
  const token = jwt.sign(userId, process.env.JWT_SECRET_KEY as string, {
    expiresIn: "5m",
  });
};
