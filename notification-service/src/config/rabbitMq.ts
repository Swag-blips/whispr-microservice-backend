import amq from "amqplib";
import logger from "../utils/logger";
import { Notification } from "../types/type";

let connection: amq.ChannelModel | null = null;
let channel: amq.Channel | null = null;

const EXCHANGE_NAME = "whispr_event";
const QUEUE_NAME = "notification.create.queue";

export const connectToRabbitMq = async () => {
  try {
    connection = await amq.connect(process.env.RABBITMQ_URL as string);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    logger.info("Connected to rabbitmq");
    return channel;
  } catch (error) {
    logger.error(error);
  }
};

export const consumeEvent = async (
  routingKey: string,
  callback: (content: Notification) => void
) => {
  if (!channel) {
    await connectToRabbitMq();
  }

  try {
    const q = await channel?.assertQueue(QUEUE_NAME, { durable: true });
    await channel?.bindQueue(QUEUE_NAME, EXCHANGE_NAME, routingKey);
    channel?.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());

        try {
          callback(content);
          channel?.ack(msg);
        } catch (err) {
          logger.error("Error processing message", err);
        }
      }
    });
  } catch (error) {
    logger.error(error);
  }
};
