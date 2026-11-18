import type { ServerResponse } from "http";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config/index.js";
import User from "../models/user.model.js";
import type { AppRequest, AuthUser, UserRole } from "../types/http.js";
import { sendResponse } from "../utils/sendResponse.js";

// Verify JWT and re-check the account in MongoDB on every protected request.
// This makes role changes and account deactivation take effect immediately.
export const authenticate = async (
  req: AppRequest,
  res: ServerResponse,
): Promise<AuthUser | null> => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    sendResponse(res, false, 401, "Authentication token is required");
    return null;
  }

  try {
    if (!config.jwtSecret) throw new Error("JWT_SECRET is not configured");
    const token = authorization.slice(7).trim();
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    if (typeof decoded.sub !== "string") throw new Error("Invalid token payload");

    const account = await User.findById(decoded.sub).select("name email role isActive");
    if (!account || !account.isActive) {
      sendResponse(res, false, 401, "Account is unavailable. Please contact support.");
      return null;
    }
    if (account.role !== "admin" && account.role !== "customer") {
      throw new Error("Invalid account role");
    }

    const user: AuthUser = {
      id: account._id.toString(),
      role: account.role as UserRole,
      email: account.email,
    };
    req.user = user;
    return user;
  } catch {
    if (!res.writableEnded) {
      sendResponse(res, false, 401, "Invalid or expired token");
    }
    return null;
  }
};

export const requireRole = (
  user: AuthUser,
  res: ServerResponse,
  roles: UserRole[],
): boolean => {
  if (!roles.includes(user.role)) {
    sendResponse(res, false, 403, "You do not have permission to perform this action");
    return false;
  }
  return true;
};
