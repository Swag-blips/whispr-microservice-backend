import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import { sendMessage } from "../controller/message.controller";
import validateRequest from "../middleware/validateRequest";
import { messageSchema } from "../utils/validate";

const router = express.Router();

router.post(
  "/message/:chatId",
  authenticateRequest,
  validateRequest(messageSchema),
  sendMessage
);
