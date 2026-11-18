import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import config from "../config/index.js";
import User from "../models/user.model.js";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const createAdmin = async () => {
  if (!config.mongoUri) throw new Error("MONGODB_URI is missing");
  const name = process.env.ADMIN_NAME || "Shop Admin";
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 8 characters) in .env before running this script");
  }
  await mongoose.connect(config.mongoUri);
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = "admin";
    existing.isActive = true;
    await existing.save();
    console.log(`Existing user ${email} promoted to admin`);
  } else {
    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({ name, email, password: hashedPassword, role: "admin" });
    console.log(`Admin account created: ${email}`);
  }
  await mongoose.disconnect();
};

createAdmin().catch(async (error) => {
  console.error("Admin setup failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
