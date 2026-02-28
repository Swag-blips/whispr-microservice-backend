import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import {
  getCurrentUser,
  getFriends,
  getUser,
  removeFriend,
  updateUserInfo,
} from "../controller/user.controller";
import validateRequest from "../middleware/validateRequest";
import { removeFriendSchema } from "../utils/validate";

const router = express.Router();

router.get("/friends", authenticateRequest, getFriends);
router.get("/currentUser", authenticateRequest, getCurrentUser);
router.get("/:username", authenticateRequest, getUser);
router.post("/currentUser", authenticateRequest, updateUserInfo);
router.post(
  "/friends/remove",
  authenticateRequest,
  validateRequest(removeFriendSchema),
  removeFriend,
);

export default router;
