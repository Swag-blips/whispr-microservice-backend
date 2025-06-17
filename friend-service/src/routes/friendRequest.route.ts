import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import {
  acceptFriendRequest,
  sendFriendRequest,
} from "../controller/friendRequest.controller";

const router = express.Router();

router.post("/sendFriendRequest", authenticateRequest, sendFriendRequest);
router.post("/acceptFriendRequest", authenticateRequest, acceptFriendRequest);
router.get("/declineFriendRequest/:id", authenticateRequest, )

export default router;
