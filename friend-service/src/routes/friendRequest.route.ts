import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import {
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
} from "../controller/friendRequest.controller";

const router = express.Router();

router.post("/sendFriendRequest", authenticateRequest, sendFriendRequest);
router.post("/acceptFriendRequest", authenticateRequest, acceptFriendRequest);
router.get(
  "/declineFriendRequest/:id",
  authenticateRequest,
  declineFriendRequest,
);

router.get("/health", async (req, res) => {
  try {
    res.status(200).json({
      status: "ok",
      message: "Friend service is healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Friend service health check failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/ping", (req, res) => {
  res.status(200).json({
    status: "pong",
    timestamp: new Date().toISOString(),
  });
});

export default router;
