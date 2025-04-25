import mongoose from "mongoose";
import logger from "../utils/logger";

export let connection: typeof mongoose | null = null;

const connectToMongo = async () => {
  try {
    connection = await mongoose.connect(process.env.MONGODB_URI as string);

    logger.info(`connected to mongo db ${connection.connection.host}`);
  } catch (error) {
    console.error(error);
  }
};

export default connectToMongo;
