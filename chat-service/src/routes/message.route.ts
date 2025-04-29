import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import { createGroup, sendMessage } from "../controller/message.controller";
import validateRequest from "../middleware/validateRequest";
import { createGroupSchema, messageSchema } from "../utils/validate";

const router = express.Router();

router.post(
  "/message/:chatId",
  authenticateRequest,
  validateRequest(messageSchema),
  sendMessage
);

router.post("/group", validateRequest(createGroupSchema), createGroup);

export default router;
