import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import { getNotification } from "../controller/notification.controller";

const router = express.Router();

router.get("/notifications", authenticateRequest, getNotification);
