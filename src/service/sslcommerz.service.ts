import { randomBytes } from "crypto";
import mongoose from "mongoose";
import config from "../config/index.js";
import Payment from "../models/payment.model.js";
import Order from "../models/order.model.js";

const gatewayBase = config.sslIsLive
  ? "https://securepay.sslcommerz.com"
  : "https://sandbox.sslcommerz.com";

const makeTranId = () => `SHOP${Date.now()}${randomBytes(3).toString("hex")}`.slice(0, 30);

export const initiatePayment = async (orderId: string, userId: string) => {
  if (!config.sslStoreId || !config.sslStorePassword) {
    throw new Error("SSLCommerz store credentials are missing in .env");
  }
  if (!config.appBaseUrl.startsWith("https://") && config.nodeEnv === "production") {
    throw new Error("APP_BASE_URL must use HTTPS in production");
  }

  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw new Error("Order not found");
  if (order.paymentStatus === "paid") throw new Error("This order is already paid");
  if (order.total < 10 || order.total > 500000) throw new Error("SSLCommerz supports transactions from BDT 10 to BDT 500,000");
  if (order.status === "cancelled") throw new Error("Cancelled orders cannot be paid");

  const tranId = makeTranId();
  const payment = await Payment.create({
    order: order._id,
    user: userId,
    tranId,
    amount: order.total,
    currency: "BDT",
    status: "initiated",
  });

  const customer = await (await import("../models/user.model.js")).default.findById(userId);
  const shipping = order.shippingAddress as unknown as { fullName?: string; phone?: string; address?: string; city?: string; postalCode?: string; country?: string };
  const form = new URLSearchParams({
    store_id: config.sslStoreId,
    store_passwd: config.sslStorePassword,
    total_amount: Number(order.total).toFixed(2),
    currency: "BDT",
    tran_id: tranId,
    success_url: `${config.appBaseUrl}/api/payments/sslcommerz/success`,
    fail_url: `${config.appBaseUrl}/api/payments/sslcommerz/fail`,
    cancel_url: `${config.appBaseUrl}/api/payments/sslcommerz/cancel`,
    ipn_url: `${config.appBaseUrl}/api/payments/sslcommerz/ipn`,
    shipping_method: "Courier",
    num_of_item: String(order.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)),
    product_amount: Number(order.subtotal).toFixed(2),
    product_name: "E-commerce order",
    product_category: "General",
    product_profile: "physical-goods",
    cus_name: String(shipping.fullName || customer?.name || "Customer"),
    cus_email: String(customer?.email || "customer@example.com"),
    cus_add1: String(shipping.address || "N/A"),
    cus_city: String(shipping.city || "Dhaka"),
    cus_postcode: String(shipping.postalCode || "1000"),
    cus_country: String(shipping.country || "Bangladesh"),
    cus_phone: String(shipping.phone || customer?.phone || "01700000000"),
    ship_name: String(shipping.fullName || customer?.name || "Customer"),
    ship_add1: String(shipping.address || "N/A"),
    ship_city: String(shipping.city || "Dhaka"),
    ship_postcode: String(shipping.postalCode || "1000"),
    ship_country: String(shipping.country || "Bangladesh"),
  });

  const response = await fetch(`${gatewayBase}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const result = (await response.json()) as { status?: string; GatewayPageURL?: string; sessionkey?: string; failedreason?: string };

  if (!response.ok || result.status !== "SUCCESS" || !result.GatewayPageURL) {
    await Payment.findByIdAndUpdate(payment._id, { status: "failed", gatewayResponse: result });
    throw new Error(result.failedreason || "Could not create SSLCommerz payment session");
  }

  await Payment.findByIdAndUpdate(payment._id, {
    status: "pending",
    sessionKey: result.sessionkey || "",
    gatewayResponse: result,
  });

  return { paymentId: payment._id, tranId, gatewayUrl: result.GatewayPageURL };
};

export const validateAndProcessPayment = async (valId: string) => {
  if (!valId) throw new Error("SSLCommerz val_id is required");
  const validationUrl = new URL(`${gatewayBase}/validator/api/validationserverAPI.php`);
  validationUrl.searchParams.set("val_id", valId);
  validationUrl.searchParams.set("store_id", config.sslStoreId);
  validationUrl.searchParams.set("store_passwd", config.sslStorePassword);
  validationUrl.searchParams.set("format", "json");

  const response = await fetch(validationUrl);
  const result = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error("SSLCommerz validation request failed");

  const tranId = String(result.tran_id || "");
  const payment = await Payment.findOne({ tranId });
  if (!payment) throw new Error("Payment transaction not found");

  const order = await Order.findById(payment.order);
  if (!order) throw new Error("Order for this payment was not found");
  if (order.status === "cancelled" || ["failed", "cancelled"].includes(order.paymentStatus)) {
    await Payment.findByIdAndUpdate(payment._id, { status: "review", valId, gatewayResponse: result });
    return { status: "review", orderId: payment.order.toString() };
  }

  const validStatus = result.status === "VALID" || result.status === "VALIDATED";
  const amountMatches = Number(result.amount).toFixed(2) === Number(payment.amount).toFixed(2);
  const currencyMatches = String(result.currency || "").toUpperCase() === payment.currency;
  if (!validStatus || !amountMatches || !currencyMatches) {
    await Payment.findByIdAndUpdate(payment._id, { status: "failed", valId, gatewayResponse: result });
    await markOrderUnpaid(payment.order.toString(), "failed");
    return { status: "failed", orderId: payment.order.toString() };
  }

  if (Number(result.risk_level) === 1) {
    await Payment.findByIdAndUpdate(payment._id, { status: "review", valId, gatewayResponse: result });
    await Order.findByIdAndUpdate(payment.order, { paymentStatus: "review", reservationExpiresAt: null });
    return { status: "review", orderId: payment.order.toString() };
  }

  await Payment.findByIdAndUpdate(payment._id, { status: "success", valId, gatewayResponse: result });
  await Order.findOneAndUpdate(
    { _id: payment.order, paymentStatus: { $in: ["pending", "review"] } },
    { paymentStatus: "paid", status: "confirmed", reservationExpiresAt: null },
  );
  return { status: "success", orderId: payment.order.toString() };
};

export const markOrderUnpaid = async (orderId: string, status: "failed" | "cancelled") => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOneAndUpdate(
        { _id: orderId, paymentStatus: { $in: ["pending", "review"] }, status: { $ne: "cancelled" } },
        { $set: { paymentStatus: status, status: "cancelled", reservationExpiresAt: null } },
        { new: true, session },
      );
      if (!order) return; // Idempotent: a repeated callback must not restore stock twice.

      const Product = (await import("../models/product.model.js")).default;
      const Coupon = (await import("../models/coupon.model.js")).default;
      for (const item of order.items) {
        await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
      }
      if (order.couponCode) {
        await Coupon.updateOne(
          { code: order.couponCode, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } },
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }
};

export const queryAndProcessTransaction = async (tranId: string) => {
  const payment = await Payment.findOne({ tranId });
  if (!payment) throw new Error("Payment transaction not found");
  const queryUrl = new URL(`${gatewayBase}/validator/api/merchantTransIDvalidationAPI.php`);
  queryUrl.searchParams.set("tran_id", tranId);
  queryUrl.searchParams.set("store_id", config.sslStoreId);
  queryUrl.searchParams.set("store_passwd", config.sslStorePassword);
  queryUrl.searchParams.set("format", "json");
  const response = await fetch(queryUrl);
  const result = (await response.json()) as { APIConnect?: string; element?: Array<Record<string, unknown>> };
  if (!response.ok || result.APIConnect !== "DONE" || !Array.isArray(result.element)) throw new Error("SSLCommerz transaction query failed");
  const transaction = result.element.find((item) => String(item.tran_id) === tranId);
  if (!transaction) throw new Error("Transaction not found at SSLCommerz");
  if (transaction.status === "VALID" || transaction.status === "VALIDATED") {
    return validateAndProcessPayment(String(transaction.val_id || ""));
  }
  if (Number(transaction.amount).toFixed(2) !== Number(payment.amount).toFixed(2) || String(transaction.currency || "").toUpperCase() !== payment.currency) {
    throw new Error("Transaction amount or currency does not match");
  }
  if (transaction.status === "FAILED") {
    await Payment.findByIdAndUpdate(payment._id, { status: "failed", gatewayResponse: transaction });
    await markOrderUnpaid(payment.order.toString(), "failed");
    return { status: "failed", orderId: payment.order.toString() };
  }
  return { status: "pending", orderId: payment.order.toString() };
};
