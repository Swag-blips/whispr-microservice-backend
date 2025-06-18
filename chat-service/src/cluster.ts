import cluster from "cluster";
import os from "os";
import logger from "./utils/logger";
import { startServer } from "./server";
import { connectToRabbitMq, consumeEvent } from "./config/rabbitMq";
import { ChatCreatedEvent, ChatDeletedEvent } from "./types/type";
import { handleCreateChat, handleDeleteFriends } from "./events/eventHandler";

const numOfCpus = os.cpus().length;

if (cluster.isPrimary) {
  logger.info(`master ${process.pid} is running`);

  for (let i = 0; i < numOfCpus; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.info(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  const isFirstWorker = cluster.worker?.id === 1;

  if (isFirstWorker) {
    connectToRabbitMq(),
      consumeEvent<ChatCreatedEvent>(
        "chat.created.queue",
        "chat.created",
        handleCreateChat 
      ),
      consumeEvent<ChatDeletedEvent>(
        "chat.deleted.queue",
        "chat.deleted",
        handleDeleteFriends
      ); 
  }

  startServer();
}
   