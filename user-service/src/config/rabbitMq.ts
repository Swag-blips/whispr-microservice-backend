import amq from "amqplib";
import logger from "../utils/logger";

let connection = null;
let channel: amq.Channel | null = null;

const EXCHANGE_NAME = "whispr_event";
// const QUEUE_NAME = "user.create.queue";
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000;
const RETRY_QUEUE = "user.create.retry.queue";

export async function connectToRabbitMq(retries = 10) {
  while (retries) {
    try {
      connection = await amq.connect(process.env.RABBITMQ_URL as string);
      channel = await connection.createChannel();

      await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
      await channel.assertQueue(RETRY_QUEUE, {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": EXCHANGE_NAME,
          "x-dead-letter-routing-key": RETRY_QUEUE,
          "x-message-ttl": RETRY_DELAY,
        },
      });
      logger.info("Connected to rabbitmq");

      return channel;
    } catch (error) {
      logger.error("Error connecting to rabbitmq");
      retries--;
      await new Promise((res) => setTimeout(res, 10000));
    }
  }
  throw new Error("RabbitMQ not available after multiple attempts");
}

export async function publishEvent(routingKey: string, message: object) {
  if (!channel) {
    await connectToRabbitMq();
  }

  channel?.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );
  logger.info(`Event published: ${routingKey}`);
}

export async function consumeEvent<T>(
  routingKey: string,
  queueName: string,
  callback: (content: T) => void
) {
  if (!channel) {
    await connectToRabbitMq();
  }

  try {
    const q = await channel?.assertQueue(queueName, { durable: true });
    await channel?.bindQueue(queueName, EXCHANGE_NAME, routingKey);
    channel?.consume(queueName, (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());

        try {
          callback(content);
          channel?.ack(msg);

          return;
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
