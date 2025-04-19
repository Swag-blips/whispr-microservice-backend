import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

const proxyOptions = {
  proxyReqPathResolver: (req: Request) => {
    logger.info(req.url);
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err: Error, res: Response, next: NextFunction) => {
    logger.error(`proxy error ${err}`);

    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  },
};

export default proxyOptions;
