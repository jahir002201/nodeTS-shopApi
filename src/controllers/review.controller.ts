import type { ServerResponse } from "http";
import type { AppRequest } from "../types/http.js";
import Review from "../models/review.model.js";
import Order from "../models/order.model.js";
import { bodyParser } from "../utils/parseBody.js";
import { sendResponse } from "../utils/sendResponse.js";
import { HttpError } from "../utils/httpError.js";

export const listProductReviews = async (req: AppRequest, res: ServerResponse) => {
  const reviews = await Review.find({ product: req.params?.productId }).populate("user", "name").sort({ createdAt: -1 });
  sendResponse(res, true, 200, "Reviews retrieved successfully", reviews);
};
export const createReview = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, "Rating must be between 1 and 5");
  const purchased = await Order.exists({ user: req.user?.id, paymentStatus: "paid", "items.product": req.params?.productId });
  if (!purchased) throw new HttpError(403, "You can review a product only after purchasing it");
  const review = await Review.create({ user: req.user?.id, product: req.params?.productId, rating, comment: String(body.comment || "") });
  sendResponse(res, true, 201, "Review submitted successfully", review);
};
export const deleteReview = async (req: AppRequest, res: ServerResponse) => {
  const filter = req.user?.role === "admin" ? { _id: req.params?.id } : { _id: req.params?.id, user: req.user?.id };
  const review = await Review.findOneAndDelete(filter);
  if (!review) throw new HttpError(404, "Review not found");
  sendResponse(res, true, 200, "Review deleted successfully");
};
