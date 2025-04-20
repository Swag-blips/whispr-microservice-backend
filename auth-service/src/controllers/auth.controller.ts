import { Request, Response } from "express";
import { validateRegistration } from "../utils/validate";
import logger from "../utils/logger";

export const register = async (req: Request, res: Response) => {
  logger.info("Registration endpoint");
  try {
    const { username, email, password, avatar } = req.body;

    const error = validateRegistration(req.body);

    if (error) {
      logger.warn(error.error?.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.error?.details[0].message,
      });
    }

    
  } catch (error) {
    console.error(error);
  }
};
