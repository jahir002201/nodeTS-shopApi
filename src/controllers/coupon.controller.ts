import type { ServerResponse } from "http";
import type { AppRequest } from "../types/http.js";
import Coupon from "../models/coupon.model.js";
import { bodyParser } from "../utils/parseBody.js";
import { sendResponse } from "../utils/sendResponse.js";
import { HttpError } from "../utils/httpError.js";

export const listCoupons = async (_req: AppRequest, res: ServerResponse) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  sendResponse(res, true, 200, "Coupons retrieved successfully", coupons);
};
export const createCoupon = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const code = String(body.code || "").trim().toUpperCase();
  const discountValue = Number(body.discountValue);
  const expiresAt = new Date(String(body.expiresAt || ""));
  if (!code || !Number.isFinite(discountValue) || discountValue <= 0 || Number.isNaN(expiresAt.getTime())) {
    throw new HttpError(400, "Code, positive discountValue and valid expiresAt are required");
  }
  if (body.discountType === "percentage" && discountValue > 100) throw new HttpError(400, "Percentage discount cannot exceed 100");
  const coupon = await Coupon.create({ ...body, code, expiresAt });
  sendResponse(res, true, 201, "Coupon created successfully", coupon);
};
export const updateCoupon = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const coupon = await Coupon.findByIdAndUpdate(req.params?.id, body, { new: true, runValidators: true });
  if (!coupon) throw new HttpError(404, "Coupon not found");
  sendResponse(res, true, 200, "Coupon updated successfully", coupon);
};
export const deleteCoupon = async (req: AppRequest, res: ServerResponse) => {
  const coupon = await Coupon.findByIdAndDelete(req.params?.id);
  if (!coupon) throw new HttpError(404, "Coupon not found");
  sendResponse(res, true, 200, "Coupon deleted successfully");
};
