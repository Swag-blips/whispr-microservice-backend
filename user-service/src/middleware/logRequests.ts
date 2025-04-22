import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

const logRequests = (req: Request, res: Response, next: NextFunction) => {
  logger.info(` received a ${req.method} request to ${req.url}`);
  logger.info(`${req.body}`);
  next();
};

export default logRequests;
