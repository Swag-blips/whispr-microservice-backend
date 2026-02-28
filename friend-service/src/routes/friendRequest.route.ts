import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import validateFriendRequest from "../middleware/validateFriendRequest";
import {
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
} from "../controller/friendRequest.controller";

const router = express.Router();

router.post("/sendFriendRequest", authenticateRequest, validateFriendRequest, sendFriendRequest);
router.post("/acceptFriendRequest", authenticateRequest, acceptFriendRequest);
router.delete(
  "/declineFriendRequest/:id",
  authenticateRequest,
  declineFriendRequest
);



export default router;