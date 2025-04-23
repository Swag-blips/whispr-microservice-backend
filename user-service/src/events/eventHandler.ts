import User from "../model/user.model";
import { EventUser } from "../types/types";
import logger from "../utils/logger";

const handleCreatedUser = async (user: EventUser) => {
  try {
    await User.create({
      email: user.email,
      username: user.username,
    });

    logger.info("User successfully created");
  } catch (error) {
    logger.error(error);
  }
};

export default handleCreatedUser;
