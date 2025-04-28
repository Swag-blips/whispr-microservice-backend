import { Request, Response } from "express";
import logger from "../utils/logger";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    

    if (!chatId) {
      res.status(400).json({ success: false, message: "chatId is required" });
      return;
    }
  } catch (error) {
    logger.error(`An error occured while sending message ${error}`);
    res.status(500).json({ error: error });
  }
};
