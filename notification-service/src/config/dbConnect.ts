import mongoose from "mongoose";
import logger from "../utils/logger";

const connectToMongo = async () => {
  try {
    const connection = await mongoose.connect(
      process.env.MONGODB_URI as string
    );

    logger.info(`connected to mongo db ${connection.connection.host}`);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};

export default connectToMongo;
