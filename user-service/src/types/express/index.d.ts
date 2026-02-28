/// <reference types="express" />

import { Request } from "express";
import { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      userId?: Types.ObjectId;
      user?: {
        id: string;
        email?: string;
        [key: string]: any;
      };
    }
  }
}