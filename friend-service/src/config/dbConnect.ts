import mongoose from "mongoose";
import logger from "../utils/logger";

const connectToMongo = async () => {
  try {
    const connection = await mongoose.connect(
      (process.env.MONGODB_URI + "-invalid") as string,
    );

    logger.info(`connected to mongo db ${connection.connection.host}`);
  } catch (error) {
    console.error(error);
  }
};

export default connectToMongo;
