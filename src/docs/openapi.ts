const pathParam = (name: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string" },
});

const requestBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        additionalProperties: true,
      },
    },
  },
};

const operation = (
  summary: string,
  tag: string,
  secured = false,
  params: object[] = [],
  hasBody = false,
) => ({
  summary,
  tags: [tag],
  ...(secured ? { security: [{ bearerAuth: [] }] } : {}),
  ...(params.length ? { parameters: params } : {}),
  ...(hasBody ? { requestBody } : {}),
  responses: {
    "200": { description: "Successful response" },
    "201": { description: "Resource created" },
    "400": { description: "Bad request" },
    "401": { description: "Unauthorized" },
    "403": { description: "Forbidden" },
    "404": { description: "Resource not found" },
    "500": { description: "Internal server error" },
  },
});

const id = pathParam("id");
const productId = pathParam("productId");
const orderId = pathParam("orderId");

const secured = true;

const openApiDocument = {
  openapi: "3.0.3",

  info: {
    title: "NodeTS Shop API",
    version: "1.0.0",
    description:
      "E-commerce REST API built with Native Node.js, TypeScript and MongoDB.",
  },

  servers: [
    {
      url: "http://localhost:5000",
      description: "Local development server",
    },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token",
      },
    },
  },

  paths: {
    "/": {
      get: operation("API welcome message", "General"),
    },
    "/api/health": {
      get: operation("Check API health", "General"),
    },

    "/api/auth/register": {
      post: operation("Register customer", "Authentication", false, [], true),
    },
    "/api/auth/login": {
      post: operation("Login user", "Authentication", false, [], true),
    },
    "/api/auth/me": {
      get: operation("Get logged-in user", "Authentication", secured),
      patch: operation("Update profile", "Authentication", secured, [], true),
    },

    "/api/users": {
      get: operation("Get all users (Admin)", "Users", secured),
    },
    "/api/users/{id}": {
      get: operation("Get user by ID", "Users", secured, [id]),
      patch: operation("Update user", "Users", secured, [id], true),
    },
    "/api/users/{id}/role": {
      patch: operation("Update user role", "Users", secured, [id], true),
    },
    "/api/users/{id}/status": {
      patch: operation("Update user status", "Users", secured, [id], true),
    },

    "/api/categories": {
      get: operation("Get all categories", "Categories"),
      post: operation("Create category (Admin)", "Categories", secured, [], true),
    },
    "/api/categories/{id}": {
      get: operation("Get category", "Categories", false, [id]),
      put: operation("Update category (Admin)", "Categories", secured, [id], true),
      delete: operation("Delete category (Admin)", "Categories", secured, [id]),
    },

    "/api/products": {
      get: operation("Get all products", "Products"),
      post: operation("Create product (Admin)", "Products", secured, [], true),
    },
    "/api/products/{id}": {
      get: operation("Get product", "Products", false, [id]),
      put: operation("Update product (Admin)", "Products", secured, [id], true),
      delete: operation("Delete product (Admin)", "Products", secured, [id]),
    },
    "/api/products/{productId}/reviews": {
      get: operation("Get product reviews", "Reviews", false, [productId]),
      post: operation("Create product review", "Reviews", secured, [productId], true),
    },
    "/api/reviews/{id}": {
      delete: operation("Delete review", "Reviews", secured, [id]),
    },

    "/api/cart": {
      get: operation("Get customer cart", "Cart", secured),
      delete: operation("Clear cart", "Cart", secured),
    },
    "/api/cart/items": {
      post: operation("Add product to cart", "Cart", secured, [], true),
    },
    "/api/cart/items/{productId}": {
      put: operation("Update cart item", "Cart", secured, [productId], true),
      delete: operation("Remove cart item", "Cart", secured, [productId]),
    },

    "/api/wishlist": {
      get: operation("Get wishlist", "Wishlist", secured),
      post: operation("Add wishlist item", "Wishlist", secured, [], true),
    },
    "/api/wishlist/{productId}": {
      delete: operation("Remove wishlist item", "Wishlist", secured, [productId]),
    },

    "/api/addresses": {
      get: operation("Get addresses", "Addresses", secured),
      post: operation("Create address", "Addresses", secured, [], true),
    },
    "/api/addresses/{id}": {
      put: operation("Update address", "Addresses", secured, [id], true),
      delete: operation("Delete address", "Addresses", secured, [id]),
    },

    "/api/coupons": {
      get: operation("Get coupons (Admin)", "Coupons", secured),
      post: operation("Create coupon (Admin)", "Coupons", secured, [], true),
    },
    "/api/coupons/{id}": {
      put: operation("Update coupon (Admin)", "Coupons", secured, [id], true),
      delete: operation("Delete coupon (Admin)", "Coupons", secured, [id]),
    },

    "/api/orders": {
      get: operation("Get all orders (Admin)", "Orders", secured),
      post: operation("Create order", "Orders", secured, [], true),
    },
    "/api/orders/my": {
      get: operation("Get my orders", "Orders", secured),
    },
    "/api/orders/{id}": {
      get: operation("Get order details", "Orders", secured, [id]),
    },
    "/api/orders/{id}/cancel": {
      patch: operation("Cancel order", "Orders", secured, [id]),
    },
    "/api/orders/{id}/status": {
      patch: operation("Update order status (Admin)", "Orders", secured, [id], true),
    },

    "/api/payments/sslcommerz/{orderId}/init": {
      post: operation("Initialize SSLCommerz payment", "Payments", secured, [orderId]),
    },
    "/api/payments/{id}": {
      get: operation("Get payment details", "Payments", secured, [id]),
    },
    "/api/payments/{id}/review": {
      patch: operation("Review payment (Admin)", "Payments", secured, [id], true),
    },
    "/api/payments/sslcommerz/success": {
      post: operation("SSLCommerz success callback", "Payments", false, [], true),
    },
    "/api/payments/sslcommerz/fail": {
      post: operation("SSLCommerz failure callback", "Payments", false, [], true),
    },
    "/api/payments/sslcommerz/cancel": {
      post: operation("SSLCommerz cancel callback", "Payments", false, [], true),
    },
    "/api/payments/sslcommerz/ipn": {
      post: operation("SSLCommerz IPN callback", "Payments", false, [], true),
    },
  },
};

export default openApiDocument;
