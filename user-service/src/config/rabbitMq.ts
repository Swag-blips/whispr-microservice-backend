import amq from "amqplib";
import logger from "../utils/logger";

let connection = null;
let channel: amq.Channel | null = null;

const EXCHANGE_NAME = "whispr_event";

export async function connectToRabbitMq() {
  try {
    connection = await amq.connect(process.env.RABBITMQ_URL as string);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to rabbimq");
    return channel;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function consumeEvent(
  routingKey: string,
  callback: (content: object) => void
) {
  if (!channel) {
    await connectToRabbitMq();
  }
  try {
    const q = await channel?.assertQueue("", { exclusive: true });
    await channel?.bindQueue(q?.queue as string, EXCHANGE_NAME, routingKey);
    channel?.consume(q?.queue as string, (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        callback(content);
        channel?.ack(msg);
      }
    });
  } catch (error) {
    logger.error(error);
  }
}
