import amq from "amqplib";
import logger from "../utils/logger";

let connection = null;
let channel: amq.Channel | null = null;

const EXCHANGE_NAME = "whispr_event";
const QUEUE_NAME = "user.create.queue";

export async function connectToRabbitMq() {
  try {
    connection = await amq.connect(process.env.RABBITMQ_URL as string);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    logger.info("Connected to rabbimq");

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
        }
      }
    });
  } catch (error) {
    logger.error(error);
  }
}
