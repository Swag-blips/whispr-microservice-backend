import jwt from "jsonwebtoken";
import { Types } from "mongoose";

interface JwtPayload {
  userId: Types.ObjectId;
  exp: number;
  email: string;
}
export const decodeEmailToken = (token: string) => {
  const decodedToken = jwt.decode(token) as JwtPayload;

  return decodedToken;
};
