import { Schema, model } from "mongoose";

const addressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, default: "" },
    country: { type: String, default: "Bangladesh" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Address = model("Address", addressSchema);
export default Address;
