import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

// Authentication-specific logger
export const authLogger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  },
  pino.destination("auth-logs.log")
);

// Helper function to log authentication attempts
export const logAuthAttempt = (userId: string, success: boolean, reason?: string) => {
  const logData = {
    timestamp: new Date().toISOString(),
    userId,
    success,
    reason: reason || (success ? "Authentication successful" : "Authentication failed"),
    type: "AUTH_ATTEMPT",
  };

  if (success) {
    authLogger.info(logData, "Authentication successful");
  } else {
    authLogger.error(logData, "Authentication failed");
  }
};

// Helper function to log user detail retrieval attempts
export const logUserDetailFetch = (userId: string, success: boolean, error?: string) => {
  const logData = {
    timestamp: new Date().toISOString(),
    userId,
    success,
    error: error || null,
    type: "USER_DETAIL_FETCH",
  };

  if (success) {
    authLogger.info(logData, "User details retrieved successfully");
  } else {
    authLogger.error(logData, "Failed to retrieve user details");
  }
};

export default logger;