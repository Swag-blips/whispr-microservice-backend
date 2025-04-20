import jwt from "jsonwebtoken";
import { Types } from "mongoose";

export const generateAccessToken = (
  userId: Types.ObjectId,
  email: string
) => {};

export const generateMailToken = (userId: Types.ObjectId, email: string) => {
  const token = jwt.sign(
    {
      userId,
      email,
    },
    process.env.JWT_SECRET_KEY as string,
    {
      expiresIn: "5m",
    }
  );

  return token;
};
