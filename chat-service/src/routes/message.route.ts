import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import { sendMessage } from "../controller/message.controller";

const router = express.Router();

router.post("/message/:chatId", authenticateRequest, sendMessage);
