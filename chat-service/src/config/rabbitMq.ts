import amq from "amqplib";
import logger from "../utils/logger";

let connection: amq.ChannelModel | null = null;
let channel: amq.Channel | null = null;

const EXCHANGE_NAME = "whispr_event";
const RETRY_QUEUE = "chat.created.retry.queue";
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000;

export const connectToRabbitMq = async (retries = 5) => {
  while (retries) {
    try {
      connection = await amq.connect(process.env.RABBITMQ_URL as string);
      channel = await connection.createChannel();

      await channel?.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

      await channel.assertQueue(RETRY_QUEUE, {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": EXCHANGE_NAME,
          "x-dead-letter-routing-key": RETRY_QUEUE,
          "x-message-ttl": RETRY_DELAY,
        },
      });
      logger.info("Connected to rabbitMq");

      return channel;
    } catch (error) {
      logger.error("an error occured connecting to rabbitmq", error);
      retries--;
      await new Promise((res) => setTimeout(res, 10000));
    }
  }

  throw new Error("RabbitMQ not available after multiple attempts");
};

export const consumeEvent = async <T>(
  queueName: string,
  routingKey: string,
  callback: (content: T) => void
) => {
  logger.info("consume event started");
  if (!connection) {
    await connectToRabbitMq();
  }

  try {
    const q = await channel?.assertQueue(queueName, { durable: true });

    await channel?.bindQueue(queueName, EXCHANGE_NAME, routingKey);

    channel?.consume(queueName, (msg) => {
      logger.info("message coming in chat service", msg);
      if (msg !== null) {
        try {
          const message = JSON.parse(msg.content.toString());
          callback(message);
          channel?.ack(msg);

          return;
        } catch (error) {
          logger.error("error processing message", error);

          const retries = (msg?.properties.headers?.["x-retries"] ||
            0) as number;

          const newRetry = retries + 1;

          if (newRetry <= MAX_RETRIES) {
            channel?.publish("", RETRY_QUEUE, msg?.content, {
              headers: {
                "x-retries": newRetry,
              },
              persistent: true,
            });
            channel?.ack(msg);
            logger.info(`Retrying message. Attempt ${newRetry}`);
          } else {
            logger.error(
              `Message failed after ${MAX_RETRIES} retries. Discarding.`
            );
            channel?.ack(msg);
          }
        }
      }
    });
  } catch (error) {
    logger.error("An error occured consuming event", error);
  }
};
