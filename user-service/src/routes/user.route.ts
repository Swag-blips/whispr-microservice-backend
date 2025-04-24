import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import { getUser } from "../controller/user.controller";

const router = express.Router();

router.get("/:username", authenticateRequest, getUser);

export default router;
