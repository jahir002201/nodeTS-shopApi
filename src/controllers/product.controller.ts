import type { ServerResponse } from "http";
import type { AppRequest } from "../types/http.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Review from "../models/review.model.js";
import { bodyParser } from "../utils/parseBody.js";
import { sendResponse } from "../utils/sendResponse.js";
import { HttpError } from "../utils/httpError.js";

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const listProducts = async (req: AppRequest, res: ServerResponse) => {
  const url = new URL(req.url || "/", "http://localhost");
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 10));
  const search = url.searchParams.get("search") || "";
  const category = url.searchParams.get("category");
  const filter: Record<string, unknown> = { isActive: true };
  if (search) filter.$text = { $search: search };
  if (category) filter.category = category;
  const [products, total] = await Promise.all([
    Product.find(filter).populate("category", "name slug").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);
  sendResponse(res, true, 200, "Products retrieved successfully", { products, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
};
export const getProduct = async (req: AppRequest, res: ServerResponse) => {
  const product = await Product.findById(req.params?.id).populate("category", "name slug");
  if (!product || !product.isActive) throw new HttpError(404, "Product not found");
  const reviews = await Review.find({ product: product._id }).populate("user", "name").sort({ createdAt: -1 });
  sendResponse(res, true, 200, "Product retrieved successfully", { product, reviews });
};
export const createProduct = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const name = String(body.name || "").trim();
  const categoryId = String(body.category || "");
  const price = Number(body.price);
  if (!name || !categoryId || !Number.isFinite(price) || price < 0) throw new HttpError(400, "Name, category and valid price are required");
  if (!(await Category.exists({ _id: categoryId }))) throw new HttpError(400, "Category does not exist");
  const productData: Record<string, unknown> = {
    name,
    slug: slugify(String(body.slug || name)),
    description: String(body.description || ""),
    price,
    compareAtPrice: body.compareAtPrice === undefined ? null : Number(body.compareAtPrice),
    stock: Math.max(0, Number(body.stock) || 0),
    images: Array.isArray(body.images) ? body.images.map(String) : [],
    category: categoryId,
  };
  if (body.sku) productData.sku = String(body.sku);
  const product = await Product.create(productData as any);
  sendResponse(res, true, 201, "Product created successfully", product);
};
export const updateProduct = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const updates: Record<string, unknown> = {};
  for (const key of ["name", "description", "price", "compareAtPrice", "stock", "sku", "category", "isActive"]) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (typeof body.name === "string") {
    if (!body.name.trim()) throw new HttpError(400, "Product name cannot be empty");
    updates.name = body.name.trim();
    updates.slug = slugify(String(body.slug || body.name));
  }
  if (body.slug !== undefined && body.name === undefined) updates.slug = slugify(String(body.slug));
  if (Array.isArray(body.images)) updates.images = body.images.map(String);
  if (body.category !== undefined && !(await Category.exists({ _id: String(body.category) }))) {
    throw new HttpError(400, "Category does not exist");
  }
  if (body.price !== undefined && (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)) throw new HttpError(400, "Price must be a non-negative number");
  if (body.stock !== undefined && (!Number.isInteger(Number(body.stock)) || Number(body.stock) < 0)) throw new HttpError(400, "Stock must be a non-negative integer");
  if (Object.keys(updates).length === 0) throw new HttpError(400, "No product fields provided to update");
  const product = await Product.findByIdAndUpdate(req.params?.id, updates, { new: true, runValidators: true });
  if (!product) throw new HttpError(404, "Product not found");
  sendResponse(res, true, 200, "Product updated successfully", product);
};
export const deleteProduct = async (req: AppRequest, res: ServerResponse) => {
  const product = await Product.findByIdAndUpdate(req.params?.id, { isActive: false }, { new: true });
  if (!product) throw new HttpError(404, "Product not found");
  sendResponse(res, true, 200, "Product deactivated successfully");
};
