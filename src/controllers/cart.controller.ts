import type { ServerResponse } from "http";
import type { AppRequest } from "../types/http.js";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import { bodyParser } from "../utils/parseBody.js";
import { sendResponse } from "../utils/sendResponse.js";
import { HttpError } from "../utils/httpError.js";

export const getCart = async (req: AppRequest, res: ServerResponse) => {
  const cart = await Cart.findOne({ user: req.user?.id }).populate("items.product");
  const items = cart?.items || [];
  const subtotal = (items as any[]).reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
  sendResponse(res, true, 200, "Cart retrieved successfully", { cart: cart || { items: [] }, subtotal });
};
export const addCartItem = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const productId = String(body.productId || "");
  const quantity = Math.max(1, Math.floor(Number(body.quantity) || 1));
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new HttpError(404, "Product not found");
  if (product.stock < quantity) throw new HttpError(400, "Insufficient product stock");
  let cart = await Cart.findOne({ user: req.user?.id });
  if (!cart) cart = await Cart.create({ user: req.user?.id, items: [] });
  const existing = (cart.items as any[]).find((item) => String(item.product) === productId);
  if (existing) {
    if (existing.quantity + quantity > product.stock) throw new HttpError(400, "Requested quantity exceeds available stock");
    existing.quantity += quantity;
  } else {
    cart.items.push({ product: product._id, quantity } as never);
  }
  await cart.save();
  await cart.populate("items.product");
  sendResponse(res, true, 200, "Product added to cart", cart);
};
export const updateCartItem = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const quantity = Math.floor(Number(body.quantity));
  if (!Number.isInteger(quantity) || quantity < 1) throw new HttpError(400, "Quantity must be at least 1");
  const product = await Product.findOne({ _id: req.params?.productId, isActive: true });
  if (!product || product.stock < quantity) throw new HttpError(400, "Product unavailable or insufficient stock");
  const cart = await Cart.findOne({ user: req.user?.id });
  const item = (cart?.items as any[] | undefined)?.find((entry) => String(entry.product) === req.params?.productId);
  if (!cart || !item) throw new HttpError(404, "Cart item not found");
  item.quantity = quantity;
  await cart.save();
  await cart.populate("items.product");
  sendResponse(res, true, 200, "Cart item updated", cart);
};
export const removeCartItem = async (req: AppRequest, res: ServerResponse) => {
  const cart = await Cart.findOne({ user: req.user?.id });
  if (!cart) throw new HttpError(404, "Cart not found");
  cart.items = cart.items.filter((item: any) => String(item.product) !== req.params?.productId) as typeof cart.items;
  await cart.save();
  sendResponse(res, true, 200, "Cart item removed", cart);
};
export const clearCart = async (req: AppRequest, res: ServerResponse) => {
  const cart = await Cart.findOneAndUpdate({ user: req.user?.id }, { items: [] }, { new: true });
  sendResponse(res, true, 200, "Cart cleared", cart || { items: [] });
};
