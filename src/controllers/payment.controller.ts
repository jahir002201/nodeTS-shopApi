import type { ServerResponse } from "http";
import type { AppRequest } from "../types/http.js";
import Payment from "../models/payment.model.js";
import { bodyParser } from "../utils/parseBody.js";
import { sendResponse } from "../utils/sendResponse.js";
import { HttpError } from "../utils/httpError.js";
import { initiatePayment, queryAndProcessTransaction, validateAndProcessPayment } from "../service/sslcommerz.service.js";
import config from "../config/index.js";

export const startSslPayment = async (req: AppRequest, res: ServerResponse) => {
  const result = await initiatePayment(String(req.params?.orderId), req.user!.id);
  sendResponse(res, true, 200, "SSLCommerz payment session created", result);
};
export const getPayment = async (req: AppRequest, res: ServerResponse) => {
  const filter = req.user?.role === "admin" ? { _id: req.params?.id } : { _id: req.params?.id, user: req.user?.id };
  const payment = await Payment.findOne(filter).select("-gatewayResponse");
  if (!payment) throw new HttpError(404, "Payment not found");
  sendResponse(res, true, 200, "Payment retrieved successfully", payment);
};

const redirectFrontend = (res: ServerResponse, result: string, orderId = "") => {
  const url = new URL("/payment/result", config.frontendUrl);
  url.searchParams.set("status", result);
  if (orderId) url.searchParams.set("orderId", orderId);
  res.writeHead(303, { Location: url.toString() });
  res.end();
};

const processGatewayCallback = async (req: AppRequest, res: ServerResponse, isIpn: boolean) => {
  const body = await bodyParser(req);
  const valId = String(body.val_id || "");
  const tranId = String(body.tran_id || "");
  if (!valId && !tranId) {
    if (isIpn) return sendResponse(res, false, 400, "val_id or tran_id is required");
    return redirectFrontend(res, "pending");
  }
  try {
    const result = valId
      ? await validateAndProcessPayment(valId)
      : await queryAndProcessTransaction(tranId);
    if (isIpn) return sendResponse(res, true, 200, "IPN processed", result);
    redirectFrontend(res, result.status, result.orderId);
  } catch (error) {
    if (isIpn) return sendResponse(res, false, 400, error instanceof Error ? error.message : "IPN validation failed");
    redirectFrontend(res, "verification_failed");
  }
};

export const sslSuccess = (req: AppRequest, res: ServerResponse) => processGatewayCallback(req, res, false);
export const sslFail = (req: AppRequest, res: ServerResponse) => processGatewayCallback(req, res, false);
export const sslCancel = (req: AppRequest, res: ServerResponse) => processGatewayCallback(req, res, false);
export const sslIpn = (req: AppRequest, res: ServerResponse) => processGatewayCallback(req, res, true);

export const reviewPayment = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const decision = String(body.decision || "");
  if (decision !== "approve" && decision !== "reject") throw new HttpError(400, "decision must be approve or reject");
  const payment = await Payment.findById(req.params?.id);
  if (!payment || payment.status !== "review") throw new HttpError(404, "Payment awaiting review was not found");
  if (decision === "approve") {
    const Order = (await import("../models/order.model.js")).default;
    const order = await Order.findById(payment.order);
    if (!order || order.status === "cancelled") {
      throw new HttpError(409, "A cancelled order cannot be approved as paid. Verify and handle any refund manually.");
    }
    await Payment.findByIdAndUpdate(payment._id, { status: "success" });
    await Order.findByIdAndUpdate(payment.order, { paymentStatus: "paid", status: "confirmed", reservationExpiresAt: null });
  } else {
    await Payment.findByIdAndUpdate(payment._id, { status: "failed" });
    const { markOrderUnpaid } = await import("../service/sslcommerz.service.js");
    await markOrderUnpaid(payment.order.toString(), "failed");
  }
  sendResponse(res, true, 200, decision === "approve" ? "Payment approved after review" : "Payment rejected after review");
};
