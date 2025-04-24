import amq from "amqplib";
import logger from "../utils/logger";

let connection = null;
let channel: amq.Channel | null = null;

const EXCHANGE_NAME = "whispr_event";

export async function connectToRabbitMq() {
  try {
    connection = await amq.connect(process.env.RABBITMQ_URL as string);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    logger.info("Connected to rabbitmq");
    return channel;
  } catch (error) {
    console.log(error);
    throw error;
  }
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
