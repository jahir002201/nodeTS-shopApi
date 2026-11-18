import type { ServerResponse } from "http";
import type { AppRequest } from "../types/http.js";
import Wishlist from "../models/wishlist.model.js";
import Product from "../models/product.model.js";
import { bodyParser } from "../utils/parseBody.js";
import { sendResponse } from "../utils/sendResponse.js";
import { HttpError } from "../utils/httpError.js";

export const getWishlist = async (req: AppRequest, res: ServerResponse) => {
  const wishlist = await Wishlist.findOne({ user: req.user?.id }).populate("products");
  sendResponse(res, true, 200, "Wishlist retrieved successfully", wishlist || { products: [] });
};
export const addWishlistItem = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const productId = String(body.productId || "");
  if (!(await Product.exists({ _id: productId, isActive: true }))) throw new HttpError(404, "Product not found");
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user?.id },
    { $addToSet: { products: productId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).populate("products");
  sendResponse(res, true, 200, "Product added to wishlist", wishlist);
};
export const removeWishlistItem = async (req: AppRequest, res: ServerResponse) => {
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user?.id },
    { $pull: { products: req.params?.productId } },
    { new: true },
  ).populate("products");
  sendResponse(res, true, 200, "Product removed from wishlist", wishlist || { products: [] });
};
