import mongoose, { Types } from "mongoose";
import Address from "../models/address.model.js";
import Cart from "../models/cart.model.js";
import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import config from "../config/index.js";
import { HttpError } from "../utils/httpError.js";

const RESERVATION_MINUTES = 30;

export const createOrderFromCart = async (
  userId: string,
  addressId: string,
  couponCode?: string,
) => {
  const session = await mongoose.startSession();
  let createdOrder: InstanceType<typeof Order> | null = null;

  try {
    await session.withTransaction(async () => {
      const cart = await Cart.findOne({ user: userId }).session(session).populate("items.product");
      if (!cart || cart.items.length === 0) throw new HttpError(400, "Your cart is empty");

      const address = await Address.findOne({ _id: addressId, user: userId }).session(session);
      if (!address) throw new HttpError(404, "Shipping address not found");

      let subtotal = 0;
      const orderItems: Array<{
        product: Types.ObjectId;
        name: string;
        price: number;
        quantity: number;
        image: string;
      }> = [];

      for (const cartItem of cart.items as any[]) {
        const product = cartItem.product;
        if (!product || !product.isActive) throw new HttpError(400, "A product in your cart is unavailable");
        const quantity = Number(cartItem.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) throw new HttpError(400, "Invalid cart quantity");
        subtotal += Number(product.price) * quantity;
        orderItems.push({
          product: product._id as Types.ObjectId,
          name: product.name,
          price: Number(product.price),
          quantity,
          image: product.images?.[0] || "",
        });
      }

      let discount = 0;
      let normalizedCoupon = "";
      if (couponCode) {
        normalizedCoupon = couponCode.trim().toUpperCase();
        const coupon = await Coupon.findOne({ code: normalizedCoupon, isActive: true }).session(session);
        if (!coupon || coupon.expiresAt <= new Date() || coupon.usedCount >= coupon.usageLimit) {
          throw new HttpError(400, "Coupon is invalid, expired or fully used");
        }
        if (subtotal < coupon.minOrderAmount) throw new HttpError(400, "Order amount does not meet coupon minimum");
        discount = coupon.discountType === "percentage"
          ? subtotal * coupon.discountValue / 100
          : coupon.discountValue;
        if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
          discount = Math.min(discount, coupon.maxDiscount);
        }
        discount = Math.min(discount, subtotal);

        // Atomically claim one coupon use, preventing concurrent over-redemption.
        const claimedCoupon = await Coupon.findOneAndUpdate(
          { _id: coupon._id, isActive: true, expiresAt: { $gt: new Date() }, usedCount: { $lt: coupon.usageLimit } },
          { $inc: { usedCount: 1 } },
          { new: true, session },
        );
        if (!claimedCoupon) throw new HttpError(409, "Coupon usage limit has been reached");
      }

      // Reserve stock inside the same MongoDB transaction as the order creation.
      for (const item of orderItems) {
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity }, isActive: true },
          { $inc: { stock: -item.quantity } },
          { new: true, session },
        );
        if (!updatedProduct) throw new HttpError(409, `Stock changed for ${item.name}. Please refresh your cart`);
      }

      const shippingFee = config.shippingFee;
      const total = Math.max(0, subtotal - discount + shippingFee);
      const [order] = await Order.create([{
        user: userId,
        items: orderItems,
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          address: address.address,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
        },
        subtotal,
        discount,
        shippingFee,
        total,
        couponCode: normalizedCoupon,
        status: "pending",
        paymentStatus: "pending",
        reservationExpiresAt: new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000),
      }], { session });

      createdOrder = order ?? null;
      await Cart.updateOne({ _id: cart._id }, { $set: { items: [] } }, { session });
    });

    if (!createdOrder) throw new HttpError(500, "Order could not be created");
    return createdOrder;
  } finally {
    await session.endSession();
  }
};

// Run periodically from server.ts. Only still-pending reservations are released.
export const expirePendingOrderReservations = async (): Promise<number> => {
  const expired = await Order.find({
    status: "pending",
    paymentStatus: "pending",
    reservationExpiresAt: { $lte: new Date() },
  }).select("_id");

  let releasedCount = 0;
  for (const candidate of expired) {
    const session = await mongoose.startSession();
    let didRelease = false;
    try {
      await session.withTransaction(async () => {
        didRelease = false;
        const order = await Order.findOneAndUpdate(
          {
            _id: candidate._id,
            status: "pending",
            paymentStatus: "pending",
            reservationExpiresAt: { $lte: new Date() },
          },
          { $set: { status: "cancelled", paymentStatus: "cancelled", reservationExpiresAt: null } },
          { new: true, session },
        );
        if (!order) return;

        for (const item of order.items) {
          await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
        }
        if (order.couponCode) {
          await Coupon.updateOne(
            { code: order.couponCode, usedCount: { $gt: 0 } },
            { $inc: { usedCount: -1 } },
            { session },
          );
        }
        didRelease = true;
      });
      if (didRelease) releasedCount += 1;
    } finally {
      await session.endSession();
    }
  }
  return releasedCount;
};

export const cancelCustomerOrder = async (orderId: string, userId: string) => {
  const session = await mongoose.startSession();
  let cancelledOrder: InstanceType<typeof Order> | null = null;
  try {
    await session.withTransaction(async () => {
      const previousOrder = await Order.findOneAndUpdate(
        { _id: orderId, user: userId, status: "pending", paymentStatus: "pending" },
        { $set: { status: "cancelled", paymentStatus: "cancelled", reservationExpiresAt: null } },
        { new: false, session },
      );
      if (!previousOrder) throw new HttpError(400, "Order cannot be cancelled");

      // This route only cancels a pending order whose stock is still reserved.
      for (const item of previousOrder.items) {
        await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
      }
      if (previousOrder.couponCode) {
        await Coupon.updateOne(
          { code: previousOrder.couponCode, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } },
          { session },
        );
      }
      cancelledOrder = await Order.findById(previousOrder._id).session(session);
    });
    return cancelledOrder;
  } finally {
    await session.endSession();
  }
};
