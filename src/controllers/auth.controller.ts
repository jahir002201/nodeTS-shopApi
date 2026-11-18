import bcrypt from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import User from "../models/user.model.js";
import config from "../config/index.js";
import { bodyParser } from "../utils/parseBody.js";
import { sendResponse } from "../utils/sendResponse.js";
import type { AppRequest } from "../types/http.js";
import type { ServerResponse } from "http";
import { HttpError } from "../utils/httpError.js";

const createToken = (user: { _id: unknown; email: string; role: string }) => {
  if (!config.jwtSecret) throw new Error("JWT_SECRET is missing");
  return jwt.sign({ email: user.email, role: user.role }, config.jwtSecret, {
    subject: String(user._id),
    expiresIn: config.jwtExpiresIn as NonNullable<SignOptions["expiresIn"]>,
  });
};

export const register = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) throw new HttpError(400, "Name, valid email and password (minimum 8 characters) are required");
  if (await User.findOne({ email })) throw new HttpError(409, "Email is already registered");
  const hashedPassword = await bcrypt.hash(password, 12);
  // Public registration always creates a customer. Admin roles must be assigned by an admin in the database/API.
  const user = await User.create({ name, email, password: hashedPassword, phone: String(body.phone || ""), role: "customer" });
  sendResponse(res, true, 201, "Registration successful", {
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token: createToken(user),
  });
};

export const login = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) throw new HttpError(401, "Invalid email or password");
  if (!user.isActive) throw new HttpError(403, "Your account is disabled");
  sendResponse(res, true, 200, "Login successful", {
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    token: createToken(user),
  });
};

export const me = async (req: AppRequest, res: ServerResponse) => {
  const user = await User.findById(req.user?.id).select("-password");
  if (!user) throw new HttpError(404, "User not found");
  sendResponse(res, true, 200, "Profile retrieved successfully", user);
};

export const updateProfile = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.phone === "string") updates.phone = body.phone.trim();
  if (typeof body.image === "string") updates.image = body.image.trim();
  const user = await User.findByIdAndUpdate(req.user?.id, updates, { new: true, runValidators: true }).select("-password");
  sendResponse(res, true, 200, "Profile updated successfully", user);
};
