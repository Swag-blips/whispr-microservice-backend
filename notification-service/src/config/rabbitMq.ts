import amq from "amqplib";
import logger from "../utils/logger";

let connection: amq.ChannelModel | null = null;
let channel: amq.Channel | null = null;

const EXCHANGE_NAME = "whispr_event";

export const connectToRabbitMq = async () => {
  try {
    connection = await amq.connect(process.env.RABBITMQ_URL as string);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    logger.info("Connected to rabbitmq")
    return channel
  } catch (error) {
    logger.error(error);
  }
};
