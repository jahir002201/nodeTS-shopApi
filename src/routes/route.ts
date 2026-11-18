import type { ServerResponse } from "http";
import type { AppRequest, RouteHandler, UserRole } from "../types/http.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { sendResponse } from "../utils/sendResponse.js";
import { HttpError } from "../utils/httpError.js";
import * as auth from "../controllers/auth.controller.js";
import * as users from "../controllers/user.controller.js";
import * as categories from "../controllers/category.controller.js";
import * as products from "../controllers/product.controller.js";
import * as cart from "../controllers/cart.controller.js";
import * as wishlist from "../controllers/wishlist.controller.js";
import * as addresses from "../controllers/address.controller.js";
import * as coupons from "../controllers/coupon.controller.js";
import * as orders from "../controllers/order.controller.js";
import * as payments from "../controllers/payment.controller.js";
import * as reviews from "../controllers/review.controller.js";

interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
  roles?: UserRole[];
}

const routes: Route[] = [
  { method: "GET", path: "/", handler: (_req, res) => sendResponse(res, true, 200, "NodeTS Shop API is running") },
  { method: "GET", path: "/api/health", handler: (_req, res) => sendResponse(res, true, 200, "API is healthy", { timestamp: new Date().toISOString() }) },

  { method: "POST", path: "/api/auth/register", handler: auth.register },
  { method: "POST", path: "/api/auth/login", handler: auth.login },
  { method: "GET", path: "/api/auth/me", handler: auth.me, roles: ["customer", "admin"] },
  { method: "PATCH", path: "/api/auth/me", handler: auth.updateProfile, roles: ["customer", "admin"] },

  { method: "GET", path: "/api/users", handler: users.listUsers, roles: ["admin"] },
  { method: "GET", path: "/api/users/:id", handler: users.getUser, roles: ["admin"] },
  { method: "PATCH", path: "/api/users/:id", handler: users.updateUser, roles: ["admin"] },
  { method: "PATCH", path: "/api/users/:id/role", handler: users.updateUserRole, roles: ["admin"] },
  { method: "PATCH", path: "/api/users/:id/status", handler: users.updateUserStatus, roles: ["admin"] },

  { method: "GET", path: "/api/categories", handler: categories.listCategories },
  { method: "GET", path: "/api/categories/:id", handler: categories.getCategory },
  { method: "POST", path: "/api/categories", handler: categories.createCategory, roles: ["admin"] },
  { method: "PUT", path: "/api/categories/:id", handler: categories.updateCategory, roles: ["admin"] },
  { method: "DELETE", path: "/api/categories/:id", handler: categories.deleteCategory, roles: ["admin"] },

  { method: "GET", path: "/api/products", handler: products.listProducts },
  { method: "GET", path: "/api/products/:id", handler: products.getProduct },
  { method: "POST", path: "/api/products", handler: products.createProduct, roles: ["admin"] },
  { method: "PUT", path: "/api/products/:id", handler: products.updateProduct, roles: ["admin"] },
  { method: "DELETE", path: "/api/products/:id", handler: products.deleteProduct, roles: ["admin"] },
  { method: "GET", path: "/api/products/:productId/reviews", handler: reviews.listProductReviews },
  { method: "POST", path: "/api/products/:productId/reviews", handler: reviews.createReview, roles: ["customer"] },
  { method: "DELETE", path: "/api/reviews/:id", handler: reviews.deleteReview, roles: ["customer", "admin"] },

  { method: "GET", path: "/api/cart", handler: cart.getCart, roles: ["customer"] },
  { method: "POST", path: "/api/cart/items", handler: cart.addCartItem, roles: ["customer"] },
  { method: "PUT", path: "/api/cart/items/:productId", handler: cart.updateCartItem, roles: ["customer"] },
  { method: "DELETE", path: "/api/cart/items/:productId", handler: cart.removeCartItem, roles: ["customer"] },
  { method: "DELETE", path: "/api/cart", handler: cart.clearCart, roles: ["customer"] },

  { method: "GET", path: "/api/wishlist", handler: wishlist.getWishlist, roles: ["customer"] },
  { method: "POST", path: "/api/wishlist", handler: wishlist.addWishlistItem, roles: ["customer"] },
  { method: "DELETE", path: "/api/wishlist/:productId", handler: wishlist.removeWishlistItem, roles: ["customer"] },

  { method: "GET", path: "/api/addresses", handler: addresses.listAddresses, roles: ["customer"] },
  { method: "POST", path: "/api/addresses", handler: addresses.createAddress, roles: ["customer"] },
  { method: "PUT", path: "/api/addresses/:id", handler: addresses.updateAddress, roles: ["customer"] },
  { method: "DELETE", path: "/api/addresses/:id", handler: addresses.deleteAddress, roles: ["customer"] },

  { method: "GET", path: "/api/coupons", handler: coupons.listCoupons, roles: ["admin"] },
  { method: "POST", path: "/api/coupons", handler: coupons.createCoupon, roles: ["admin"] },
  { method: "PUT", path: "/api/coupons/:id", handler: coupons.updateCoupon, roles: ["admin"] },
  { method: "DELETE", path: "/api/coupons/:id", handler: coupons.deleteCoupon, roles: ["admin"] },

  { method: "POST", path: "/api/orders", handler: orders.createOrder, roles: ["customer"] },
  { method: "GET", path: "/api/orders/my", handler: orders.myOrders, roles: ["customer"] },
  { method: "GET", path: "/api/orders", handler: orders.allOrders, roles: ["admin"] },
  { method: "GET", path: "/api/orders/:id", handler: orders.getOrder, roles: ["customer", "admin"] },
  { method: "PATCH", path: "/api/orders/:id/cancel", handler: orders.cancelOrder, roles: ["customer"] },
  { method: "PATCH", path: "/api/orders/:id/status", handler: orders.updateOrderStatus, roles: ["admin"] },

  { method: "POST", path: "/api/payments/sslcommerz/:orderId/init", handler: payments.startSslPayment, roles: ["customer"] },
  { method: "GET", path: "/api/payments/:id", handler: payments.getPayment, roles: ["customer", "admin"] },
  { method: "PATCH", path: "/api/payments/:id/review", handler: payments.reviewPayment, roles: ["admin"] },
  { method: "POST", path: "/api/payments/sslcommerz/success", handler: payments.sslSuccess },
  { method: "POST", path: "/api/payments/sslcommerz/fail", handler: payments.sslFail },
  { method: "POST", path: "/api/payments/sslcommerz/cancel", handler: payments.sslCancel },
  { method: "POST", path: "/api/payments/sslcommerz/ipn", handler: payments.sslIpn },
];

const matchRoute = (routePath: string, requestPath: string): Record<string, string> | null => {
  const routeParts = routePath.split("/").filter(Boolean);
  const requestParts = requestPath.split("/").filter(Boolean);
  if (routeParts.length !== requestParts.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < routeParts.length; index++) {
    const routePart = routeParts[index]!;
    const requestPart = requestParts[index]!;
    if (routePart.startsWith(":")) params[routePart.slice(1)] = decodeURIComponent(requestPart);
    else if (routePart !== requestPart) return null;
  }
  return params;
};

const routeHandler = async (incoming: AppRequest, res: ServerResponse) => {
  const url = new URL(incoming.url || "/", "http://localhost");
  const route = routes.find((item) => item.method === (incoming.method || "GET") && matchRoute(item.path, url.pathname) !== null);
  if (!route) return sendResponse(res, false, 404, "Route not found");
  incoming.params = matchRoute(route.path, url.pathname) || {};

  if (route.roles) {
    const user = await authenticate(incoming, res);
    if (!user) return;
    if (!requireRole(user, res, route.roles)) return;
  }

  try {
    await route.handler(incoming, res);
  } catch (error) {
    if (res.writableEnded) return;
    let statusCode = error instanceof HttpError ? error.statusCode : 500;
    let message = error instanceof Error ? error.message : "Internal server error";
    if (error && typeof error === "object" && "name" in error) {
      if (error.name === "CastError") {
        statusCode = 400;
        message = "Invalid resource ID";
      } else if (error.name === "ValidationError" || error.name === "SyntaxError") {
        statusCode = 400;
      }
    }
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      statusCode = 409;
      message = "A record with this unique value already exists";
    }
    if (statusCode === 500) console.error(error);
    sendResponse(res, false, statusCode, message);
  }
};

export default routeHandler;
