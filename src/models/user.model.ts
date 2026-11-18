import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, default: "" },
    image: { type: String, default: "" },
    role: { type: String, enum: ["admin", "customer"], default: "customer" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const User = model("User", userSchema);
export default User;
