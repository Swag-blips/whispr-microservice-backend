import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import {
  getCurrentUser,
  getUser,
  updateUserInfo,
} from "../controller/user.controller";

const router = express.Router();

router.get("/currentUser", authenticateRequest, getCurrentUser);
router.get("/:username", authenticateRequest, getUser);
router.put("/currentUser", authenticateRequest, updateUserInfo);

export default router;
