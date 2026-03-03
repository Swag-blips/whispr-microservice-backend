import { Types } from "mongoose";
import { Socket } from "socket.io";
import redisClient from "../config/redis";

export const joinRoom = async (userId: Types.ObjectId, socket: Socket) => {
  console.log("REJOINING ROOM");
  try {
    const currentChat = await redisClient.get(`currentChat:${userId}`);
    if (!currentChat) return;

    socket.join(currentChat);
  } catch (error) {
    console.error(error);
  }
};
