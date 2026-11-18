import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  appBaseUrl: (process.env.APP_BASE_URL || "http://localhost:5000").replace(/\/$/, ""),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  sslStoreId: process.env.SSLCommerz_STORE_ID || "",
  sslStorePassword: process.env.SSLCommerz_STORE_PASSWORD || "",
  sslIsLive: process.env.SSLCommerz_IS_LIVE === "true",
  shippingFee: Number(process.env.SHIPPING_FEE) || 60,
};

export default config;
