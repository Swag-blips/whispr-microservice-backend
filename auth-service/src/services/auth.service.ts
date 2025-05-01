import Auth from "../models/auth.model";
import { generateMailToken } from "../utils/generateToken";
import { queue } from "../utils/imageWorker";
import { queue as emailQueue } from "../utils/emailWorker";
import { publishEvent } from "../config/rabbitMq";
import logger from "../utils/logger";
export const registerUser = async (
  email: string,
  password: string,
  username: string,
  avatar?: string
) => {
  try {
    const existingUser = await Auth.findOne({ email });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const user = new Auth({
      password,
      email,
      isVerified: false,
    });

    const token = generateMailToken(user._id, email);

    await emailQueue.add(
      "send-email",
      {
        email: email,
        username: username,
        token: token,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: true,
        removeOnFail: true,
      }
    );

    await user.save();

    if (avatar) {
      await queue.add(
        "avatar-upload",
        { imagePath: avatar, userId: user._id },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 3000 },
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
    }

    await publishEvent("user.created", { _id: user._id, username, email });

    return user;
  } catch (error) {
    logger.error(error);
    throw error; // Propagate error for controller to handle
  }
};
