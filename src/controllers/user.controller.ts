import type { ServerResponse } from "http";
import type { AppRequest } from "../types/http.js";
import User from "../models/user.model.js";
import { bodyParser } from "../utils/parseBody.js";
import { sendResponse } from "../utils/sendResponse.js";
import { HttpError } from "../utils/httpError.js";
import { isValidId } from "../utils/ids.js";

// GET /api/users?page=1&limit=10&search=rahim
export const listUsers = async (req: AppRequest, res: ServerResponse) => {
  const url = new URL(req.url || "/", "http://localhost");
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 10));
  const search = (url.searchParams.get("search") || "").trim();
  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }
  const [users, total] = await Promise.all([
    User.find(filter).select("-password").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  sendResponse(res, true, 200, "Users retrieved successfully", {
    users,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
};

// GET /api/users/:id
export const getUser = async (req: AppRequest, res: ServerResponse) => {
  const id = req.params?.id || "";
  if (!isValidId(id)) throw new HttpError(400, "Invalid user ID");
  const user = await User.findById(id).select("-password");
  if (!user) throw new HttpError(404, "User not found");
  sendResponse(res, true, 200, "User retrieved successfully", user);
};

// PATCH /api/users/:id — admin can update basic account fields, not password
export const updateUser = async (req: AppRequest, res: ServerResponse) => {
  const id = req.params?.id || "";
  if (!isValidId(id)) throw new HttpError(400, "Invalid user ID");
  const body = await bodyParser(req);
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) throw new HttpError(400, "Name must be a non-empty string");
    updates.name = body.name.trim();
  }
  if (body.email !== undefined) {
    if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) throw new HttpError(400, "A valid email is required");
    updates.email = body.email.trim().toLowerCase();
  }
  if (body.phone !== undefined) updates.phone = String(body.phone).trim();
  if (body.image !== undefined) updates.image = String(body.image).trim();
  if (Object.keys(updates).length === 0) throw new HttpError(400, "No valid fields provided to update");
  try {
    const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select("-password");
    if (!user) throw new HttpError(404, "User not found");
    sendResponse(res, true, 200, "User updated successfully", user);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) throw new HttpError(409, "Email is already in use");
    throw error;
  }
};

// PATCH /api/users/:id/role
export const updateUserRole = async (req: AppRequest, res: ServerResponse) => {
  const id = req.params?.id || "";
  if (!isValidId(id)) throw new HttpError(400, "Invalid user ID");
  if (id === req.user?.id) throw new HttpError(400, "You cannot change your own role");
  const body = await bodyParser(req);
  if (body.role !== "admin" && body.role !== "customer") throw new HttpError(400, "Role must be admin or customer");
  const user = await User.findByIdAndUpdate(id, { role: body.role }, { new: true, runValidators: true }).select("-password");
  if (!user) throw new HttpError(404, "User not found");
  sendResponse(res, true, 200, "User role updated successfully", user);
};

// PATCH /api/users/:id/status
export const updateUserStatus = async (req: AppRequest, res: ServerResponse) => {
  const id = req.params?.id || "";
  if (!isValidId(id)) throw new HttpError(400, "Invalid user ID");
  if (id === req.user?.id) throw new HttpError(400, "You cannot deactivate your own account");
  const body = await bodyParser(req);
  if (typeof body.isActive !== "boolean") throw new HttpError(400, "isActive must be true or false");
  const user = await User.findByIdAndUpdate(id, { isActive: body.isActive }, { new: true, runValidators: true }).select("-password");
  if (!user) throw new HttpError(404, "User not found");
  sendResponse(res, true, 200, body.isActive ? "User activated successfully" : "User deactivated successfully", user);
};
