import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

const errorHandler: ErrorRequestHandler = (
  err,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err.stack);

  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal server error" });

  next();
};


export default errorHandler