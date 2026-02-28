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
      error: err,
    });
  },
  preserveHeaderKeyCase: true,
  followRedirects: true,
  changeOrigin: true,
  pathRewrite: {
    "^/v1": "/api",
  },
  onProxyReq: (proxyReq: any, req: Request, res: Response) => {
    if (req.headers.authorization) {
      proxyReq.setHeader("Authorization", req.headers.authorization);
    }
    if (req.headers.cookie) {
      proxyReq.setHeader("Cookie", req.headers.cookie);
    }
  },
  onError: (err: Error, req: Request, res: Response) => {
    logger.error(`proxy error: ${err.message}`, { url: req.url });
    res.status(503).json({
      message: "Service unavailable",
      error: err.message,
    });
  },
};

export default proxyOptions;