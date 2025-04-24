import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import { getCurrentUser, getUser } from "../controller/user.controller";

const router = express.Router();

router.get("/currentUser", authenticateRequest, getCurrentUser);
router.get("/:username", authenticateRequest, getUser);

export default router;
