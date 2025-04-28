import mongoose from "mongoose";
import logger from "../utils/logger";


const connectToMongo = async () => {
  logger.info(process.env.MONGODB_URI);
  try {
    const connection = await mongoose.connect(
      process.env.MONGODB_URI as string
    );

    logger.info("connected to mongodb", connection.connection.host);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};

export default connectToMongo;
