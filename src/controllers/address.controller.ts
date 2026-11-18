import type { ServerResponse } from "http";
import type { AppRequest } from "../types/http.js";
import Address from "../models/address.model.js";
import { bodyParser } from "../utils/parseBody.js";
import { sendResponse } from "../utils/sendResponse.js";
import { HttpError } from "../utils/httpError.js";

export const listAddresses = async (req: AppRequest, res: ServerResponse) => {
  const addresses = await Address.find({ user: req.user?.id }).sort({ isDefault: -1, createdAt: -1 });
  sendResponse(res, true, 200, "Addresses retrieved successfully", addresses);
};
export const createAddress = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const required = ["fullName", "phone", "address", "city"];
  if (required.some((key) => !String(body[key] || "").trim())) throw new HttpError(400, "Full name, phone, address and city are required");
  if (body.isDefault) await Address.updateMany({ user: req.user?.id }, { isDefault: false });
  const address = await Address.create({ ...body, user: req.user?.id });
  sendResponse(res, true, 201, "Address created successfully", address);
};
export const updateAddress = async (req: AppRequest, res: ServerResponse) => {
  const body = await bodyParser(req);
  const updates: Record<string, unknown> = {};
  for (const key of ["fullName", "phone", "address", "city", "postalCode", "country", "isDefault"]) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) throw new HttpError(400, "No address fields provided to update");
  if (updates.isDefault === true) await Address.updateMany({ user: req.user?.id }, { isDefault: false });
  const address = await Address.findOneAndUpdate({ _id: req.params?.id, user: req.user?.id }, updates, { new: true, runValidators: true });
  if (!address) throw new HttpError(404, "Address not found");
  sendResponse(res, true, 200, "Address updated successfully", address);
};
export const deleteAddress = async (req: AppRequest, res: ServerResponse) => {
  const address = await Address.findOneAndDelete({ _id: req.params?.id, user: req.user?.id });
  if (!address) throw new HttpError(404, "Address not found");
  sendResponse(res, true, 200, "Address deleted successfully");
};
