import mongoose from "mongoose";
import logger from "../utils/logger";

export let connection: typeof mongoose | null = null;
const connectToMongo = async () => {
  try {
    connection = await mongoose.connect(process.env.MONGODB_URI as string);

    logger.info("connected to mongodb", connection.connection.host);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};

export default connectToMongo;
