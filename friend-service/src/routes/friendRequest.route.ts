import express from "express";
import authenticateRequest from "../middleware/authenticateRequest";
import {
  acceptFriendRequest,
  sendFriendRequest,
} from "../controller/friendRequest.controller";

const app = express();

app.post("/sendFriendRequest", authenticateRequest, sendFriendRequest);
app.post("/acceptFriendRequest", authenticateRequest, acceptFriendRequest);
