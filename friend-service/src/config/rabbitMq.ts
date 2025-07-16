import amq from "amqplib";
import logger from "../utils/logger";

let connection: amq.ChannelModel | null = null;
let channel: amq.Channel | null = null;

const EXCHANGE_NAME = "whispr_event";

export const connectToRabbitMq = async (retries = 5) => {
  while (retries) {
    try {
      connection = await amq.connect(process.env.RABBITMQ_URL as string);
      channel = await connection?.createChannel();

      await channel?.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
      logger.info("Connected to rabbitmq");
      return;
    } catch (error) {
      retries--;
      logger.error(error);
      await new Promise((res) => setTimeout(res, 10000));
    }
  }
  throw new Error("RabbitMQ not available after multiple attempts");
};

export const publishEvent = async (routingKey: string, message: object) => {
  if (!channel) {
    await connectToRabbitMq();
  }

  try {
    channel?.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(message))
    );

    logger.info("Message published from friend service");
  } catch (error) {
    logger.error(error);
  }
};
