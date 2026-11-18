import type { ServerResponse } from "http";
import type { AppRequest } from "../types/http.js";
import Order from "../models/order.model.js";
import { bodyParser } from "../utils/parseBody.js";
import { sendResponse } from "../utils/sendResponse.js";
import { HttpError } from "../utils/httpError.js";
import { cancelCustomerOrder, createOrderFromCart } from "../service/order.service.js";

export const createOrder = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const addressId = String(body.addressId || "");
  if (!addressId) throw new HttpError(400, "addressId is required");
  const order = await createOrderFromCart(req.user!.id, addressId, body.couponCode ? String(body.couponCode) : undefined);
  sendResponse(res, true, 201, "Order created. Start payment to confirm your order", order);
};
export const myOrders = async (req: AppRequest, res: ServerResponse) => {
  const orders = await Order.find({ user: req.user?.id }).sort({ createdAt: -1 });
  sendResponse(res, true, 200, "Your orders retrieved successfully", orders);
};
export const getOrder = async (req: AppRequest, res: ServerResponse) => {
  const filter = req.user?.role === "admin" ? { _id: req.params?.id } : { _id: req.params?.id, user: req.user?.id };
  const order = await Order.findOne(filter).populate("user", "name email").populate("items.product", "name images");
  if (!order) throw new HttpError(404, "Order not found");
  sendResponse(res, true, 200, "Order retrieved successfully", order);
};
export const allOrders = async (_req: AppRequest, res: ServerResponse) => {
  const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
  sendResponse(res, true, 200, "Orders retrieved successfully", orders);
};
export const cancelOrder = async (req: AppRequest, res: ServerResponse) => {
  const order = await cancelCustomerOrder(String(req.params?.id || ""), req.user!.id);
  sendResponse(res, true, 200, "Order cancelled successfully", order);
};
export const updateOrderStatus = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const allowed = ["confirmed", "processing", "shipped", "delivered"];
  const status = String(body.status || "");
  if (!allowed.includes(status)) throw new HttpError(400, "Invalid order status");
  const existing = await Order.findById(req.params?.id);
  if (!existing) throw new HttpError(404, "Order not found");
  if (existing.paymentStatus !== "paid" && status !== "cancelled") {
    throw new HttpError(409, "Only paid orders can move to fulfillment statuses");
  }
  const order = await Order.findByIdAndUpdate(req.params?.id, { status }, { new: true, runValidators: true });
  sendResponse(res, true, 200, "Order status updated", order);
};
