import { io } from "../socket/socket";
import pubClient from "../config/redis";
import { createAdapter } from "@socket.io/redis-adapter";

export async function initSocket() {
  const subClient = pubClient.duplicate();

  if (pubClient.status === "end" || pubClient.status === "close") {
    await pubClient.connect();
  }

  if (subClient.status === "end" || subClient.status === "close") {
    await subClient.connect();
  }

  io.adapter(createAdapter(pubClient, subClient));
}
