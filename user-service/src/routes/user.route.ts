import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import {
  getCurrentUser,
  getUser,
  updateUserInfo,
} from "../controller/user.controller";
import validateRequest from "../middleware/validateRequest";
import { removeFriendSchema } from "../utils/validate";

const router = express.Router();

router.get("/currentUser", authenticateRequest, getCurrentUser);
router.get("/:username", authenticateRequest, getUser);
router.put("/currentUser", authenticateRequest, updateUserInfo);
router.post(
  "/friends/remove",
  authenticateRequest,
  validateRequest(removeFriendSchema)
);

export default router;
