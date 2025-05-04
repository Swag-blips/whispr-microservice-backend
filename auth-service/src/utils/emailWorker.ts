import { Queue, Worker } from "bullmq";
import redisClient from "../config/redis";
import logger from "./logger";
import { sendVerificationMail } from "./sendMail";

export const queue = new Queue("send-email", {
  connection: redisClient,
});

const sendEmail = async (email: string, username: string, token: string) => {
  try {
    const mail = await sendVerificationMail(email, username, token);

    if (mail) {
      logger.info("Mail successfully sent");
    }
  } catch (error) {
    logger.error(error);
  }
};

export const initalizeEmailWorker = () => {
  const worker = new Worker(
    "send-email",
    async (job: {
      data: { email: string; username: string; token: string };
    }) => {
      const { email, username, token } = job.data;
      await sendEmail(email, username, token);
    },
    {
      connection: redisClient,
    }
  );

  worker.on("failed", (job, err) => {
    logger.error(`Image upload job failed for job ${job}:`, err);
  });

  return worker;
};