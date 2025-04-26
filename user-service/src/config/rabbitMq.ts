import amq from "amqplib";
import logger from "../utils/logger";

let connection = null;
let channel: amq.Channel | null = null;

const EXCHANGE_NAME = "whispr_event";
const QUEUE_NAME = "user.create.queue";
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000;
const RETRY_QUEUE = "user.create.retry.queue";

export async function connectToRabbitMq() {
  try {
    connection = await amq.connect(process.env.RABBITMQ_URL as string);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    await channel.assertQueue(RETRY_QUEUE, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": EXCHANGE_NAME,
        "x-dead-letter-routing-key": QUEUE_NAME,
        "x-message-ttl": RETRY_DELAY,
      },
    });
    logger.info("Connected to rabbitmq");

    return channel;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function consumeEvent<T>(
  routingKey: string,
  callback: (content: T) => void
) {
  if (!channel) {
    await connectToRabbitMq();
  }

  try {
    const q = await channel?.assertQueue(QUEUE_NAME, { durable: true });
    await channel?.bindQueue(QUEUE_NAME, EXCHANGE_NAME, routingKey);
    channel?.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        logger.info(content);
        try {
          callback(content);
          channel?.ack(msg);
        } catch (err) {
          logger.error("Error processing message", err);

          const retries = (msg.properties.headers?.["x-retries"] ||
            0) as number;
          const newRetries = retries + 1;

          if (newRetries <= MAX_RETRIES) {
            channel?.publish("", RETRY_QUEUE, msg.content, {
              headers: {
                "x-retries": newRetries,
              },
              persistent: true,
            });
            channel?.ack(msg);
            logger.info(`Retrying message. Attempt ${newRetries}`);
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
    logger.error(error);
  }
}
