import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import { getCurrentUser, getUser } from "../controller/user.controller";

const router = express.Router();

router.get("/:username", authenticateRequest, getUser);
router.get("/me", getCurrentUser);

export default router;
