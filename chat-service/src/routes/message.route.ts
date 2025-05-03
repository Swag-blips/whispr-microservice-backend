import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import {
  addMemberToGroup,
  createGroup,
  getMessages,
  removeMemberFromGroup,
  sendMessage,
  updateGroupDetails,
} from "../controller/message.controller";
import validateRequest from "../middleware/validateRequest";
import {
  addToGroupSchema,
  createGroupSchema,
  messageSchema,
  removeFromGroupSchema,
} from "../utils/validate";

const router = express.Router();

router.post(
  "/message/:chatId",
  authenticateRequest,
  validateRequest(messageSchema),
  sendMessage
);

router.get("/message/:chatId", authenticateRequest, getMessages);
router.get("/user-chats", authenticateRequest, )

router.post(
  "/group",
  authenticateRequest,
  validateRequest(createGroupSchema),
  createGroup
);
router.post(
  "/group/add/:chatId",
  authenticateRequest,
  validateRequest(addToGroupSchema),
  addMemberToGroup
);

router.post(
  "/group/remove/:chatId",
  authenticateRequest,
  validateRequest(removeFromGroupSchema),
  removeMemberFromGroup
);

router.put("/group/:chatId", authenticateRequest, updateGroupDetails);

export default router;
