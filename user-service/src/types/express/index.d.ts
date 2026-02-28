/// <reference types="express" />

import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      userId?: Types.ObjectId;
    }
  }
}
