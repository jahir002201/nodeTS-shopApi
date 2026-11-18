import type { ServerResponse } from "http";
import type { AppRequest } from "../types/http.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import { bodyParser } from "../utils/parseBody.js";
import { sendResponse } from "../utils/sendResponse.js";
import { HttpError } from "../utils/httpError.js";

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const listCategories = async (_req: AppRequest, res: ServerResponse) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  sendResponse(res, true, 200, "Categories retrieved successfully", categories);
};
export const getCategory = async (req: AppRequest, res: ServerResponse) => {
  const category = await Category.findById(req.params?.id);
  if (!category) throw new HttpError(404, "Category not found");
  sendResponse(res, true, 200, "Category retrieved successfully", category);
};
export const createCategory = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const name = String(body.name || "").trim();
  if (!name) throw new HttpError(400, "Category name is required");
  const category = await Category.create({ name, slug: slugify(String(body.slug || name)), description: String(body.description || ""), image: String(body.image || "") });
  sendResponse(res, true, 201, "Category created successfully", category);
};
export const updateCategory = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const updates: Record<string, unknown> = { ...body };
  delete updates._id; delete updates.__v;
  if (typeof body.name === "string") updates.slug = slugify(String(body.slug || body.name));
  const category = await Category.findByIdAndUpdate(req.params?.id, updates, { new: true, runValidators: true });
  if (!category) throw new HttpError(404, "Category not found");
  sendResponse(res, true, 200, "Category updated successfully", category);
};
export const deleteCategory = async (req: AppRequest, res: ServerResponse) => {
  const productExists = await Product.exists({ category: req.params?.id });
  if (productExists) throw new HttpError(409, "Cannot delete a category that contains products");
  const category = await Category.findByIdAndDelete(req.params?.id);
  if (!category) throw new HttpError(404, "Category not found");
  sendResponse(res, true, 200, "Category deleted successfully");
};
