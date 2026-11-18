import mongoose from "mongoose";
import config from "../config/index.js";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  if (!config.mongoUri) throw new Error("MONGODB_URI is missing in .env");
  await mongoose.connect(config.mongoUri);
  console.log("MongoDB Atlas connected successfully!");
};

export default connectDB;
