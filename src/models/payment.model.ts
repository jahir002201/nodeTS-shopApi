import { Schema, model } from "mongoose";

const paymentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gateway: { type: String, enum: ["sslcommerz"], default: "sslcommerz" },
    tranId: { type: String, required: true, unique: true },
    sessionKey: { type: String, default: "" },
    valId: { type: String, default: "" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "BDT" },
    status: { type: String, enum: ["initiated", "pending", "success", "failed", "cancelled", "review"], default: "initiated" },
    gatewayResponse: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

const Payment = model("Payment", paymentSchema);
export default Payment;
