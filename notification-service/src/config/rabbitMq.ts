import amq from "amqplib";
import logger from "../utils/logger";
import { Notification } from "../types/type";

let connection: amq.ChannelModel | null = null;
let channel: amq.Channel | null = null;

const EXCHANGE_NAME = "whispr_event";
const RETRY_QUEUE = "notification.create.retry.queue";
const RETRY_DELAY = 10000;
const MAX_RETRIES = 5;

export const connectToRabbitMq = async (retries = 5) => {
  while (retries) {
    try {
      connection = await amq.connect(process.env.RABBITMQ_URL as string);
      channel = await connection.createChannel();

      await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
      await channel.assertQueue(RETRY_QUEUE, {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": EXCHANGE_NAME,
          "x-dead-letter-routing-name": RETRY_QUEUE,
          "x-message-ttl": RETRY_DELAY,
        },
      });
      logger.info("Connected to rabbitmq");
      return channel;
    } catch (error) {
      logger.error(error);
      retries--;
      await new Promise((res) => setTimeout(res, 10000));
    }
  }
  throw new Error("RabbitMQ not available after multiple attempts");
};
export const consumeEvent = async (
  routingKey: string,
  queueName: string,
  callback: (content: Notification) => void
) => {
  if (!channel) {
    await connectToRabbitMq();
  }

  try {
    await channel!.assertQueue(queueName, { durable: true });
    await channel!.bindQueue(queueName, EXCHANGE_NAME, routingKey);

    channel!.consume(queueName, (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());

        try {
          callback(content);
          channel!.ack(msg);
        } catch (err) {
          logger.error("Error processing message", err);

          const retries = (msg.properties.headers?.["x-retries"] ||
            0) as number;
          const newRetries = retries + 1;

          if (newRetries <= MAX_RETRIES) {
            channel!.publish("", RETRY_QUEUE, msg.content, {
              headers: {
                "x-retries": newRetries,
              },
              persistent: true,
            });
          } else {
            logger.error(
              `Message failed after ${MAX_RETRIES} retries. Discarding.`
            );
            channel!.ack(msg);
          }
        }
      }
    });
  } catch (error) {
    logger.error(error);
  }
};
