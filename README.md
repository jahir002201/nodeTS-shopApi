# NodeTS Shop API ⚡

A multi-module E-commerce REST API built with **native Node.js HTTP**, **TypeScript**, **MongoDB Atlas**, **Mongoose**, JWT authentication and **SSLCommerz Hosted Checkout**. No Express or other web framework is used.

## Features

- Native `http.createServer()` server and custom route handler
- MongoDB Atlas database with Mongoose models
- Customer registration, login, JWT authentication and admin/customer roles
- User profile and admin user management
- Category and product CRUD, product search and pagination
- Cart, wishlist and shipping addresses
- Coupons and discounts
- Checkout, order history, stock reservation and order status management
- SSLCommerz sandbox/live hosted payment session
- SSLCommerz success, fail, cancel and IPN callback endpoints
- Server-to-server transaction validation (amount, currency and transaction ID)
- Product reviews restricted to customers with paid orders

## Project file map

- `src/server.ts`: native HTTP server and reservation cleanup runner
- `src/routes/route.ts`: method/path matching and role-protected routing
- `src/config/index.ts`: environment configuration
- `src/database/connect.ts`: MongoDB connection
- `src/models/`: User, Category, Product, Cart, Wishlist, Address, Coupon, Order, Payment and Review schemas
- `src/controllers/`: request handlers for each API module
- `src/service/`: checkout/stock reservation and SSLCommerz gateway workflows
- `src/middleware/auth.ts`: JWT verification and database-backed role checks
- `src/utils/`: request body parser, response helper, ID validation and HTTP errors
- `src/scripts/createAdmin.ts`: secure first-admin bootstrap

## Tech Stack

- Node.js 20+
- TypeScript
- Native Node.js HTTP module (no Express)
- MongoDB Atlas + Mongoose
- JWT + bcryptjs
- SSLCommerz V4 Hosted Checkout
- dotenv + tsx

## 1. Install

```bash
npm install
```

## 2. Environment variables

Copy `.env.example` to `.env`, then fill in your own values. Never commit `.env` or expose your SSLCommerz store password.

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/nodeTS-shopApi
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
JWT_EXPIRES_IN=7d
APP_BASE_URL=https://YOUR_PUBLIC_BACKEND_URL
FRONTEND_URL=http://localhost:5173
SSLCommerz_STORE_ID=YOUR_SANDBOX_STORE_ID
SSLCommerz_STORE_PASSWORD=YOUR_SANDBOX_STORE_PASSWORD
SSLCommerz_IS_LIVE=false
SHIPPING_FEE=60
ADMIN_NAME=Shop Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_this_admin_password
```

### MongoDB Atlas

1. Create a free MongoDB Atlas cluster.
2. Create a database user under **Database Access**.
3. Add your development IP under **Network Access**.
4. Copy the Node.js connection string into `MONGODB_URI`.
5. Replace the username and password placeholders. URL-encode special characters in the database password.

## 3. Create the first admin

Public registration always creates a customer. To create the first admin safely, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then run:

```bash
npm run admin:create
```

This creates the admin account or promotes the matching existing account. Do not add a public `role` field to registration.

## 4. Start the API

Development:

```bash
npm run dev
```

Build and run compiled JavaScript:

```bash
npm run build
npm start
```

API base URL: `http://localhost:5000`

## Authentication

Register:

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Demo Customer",
  "email": "customer@example.com",
  "password": "secret123",
  "phone": "01700000000"
}
```

Login:

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "customer@example.com",
  "password": "secret123"
}
```

Send the returned token on protected endpoints:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## API Endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/` | Public | API health message |
| GET | `/api/health` | Public | Health status |
| POST | `/api/auth/register` | Public | Register customer |
| POST | `/api/auth/login` | Public | Login |
| GET/PATCH | `/api/auth/me` | Logged in | View/update own name/phone/image profile |
| GET | `/api/users?page=1&limit=10&search=name` | Admin | List/search/paginate users |
| GET | `/api/users/:id` | Admin | User details |
| PATCH | `/api/users/:id` | Admin | Update user name/email/phone/image |
| PATCH | `/api/users/:id/role` | Admin | Change user role |
| PATCH | `/api/users/:id/status` | Admin | Enable/disable user |
| GET | `/api/categories` | Public | List categories |
| GET | `/api/categories/:id` | Public | Category detail |
| POST | `/api/categories` | Admin | Create category |
| PUT | `/api/categories/:id` | Admin | Update category |
| DELETE | `/api/categories/:id` | Admin | Delete empty category |
| GET | `/api/products?page=1&limit=10&search=phone` | Public | Search/list products |
| GET | `/api/products/:id` | Public | Product details and reviews |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Soft-delete product |
| GET | `/api/cart` | Customer | View cart |
| POST | `/api/cart/items` | Customer | Add `{ "productId": "...", "quantity": 1 }` |
| PUT | `/api/cart/items/:productId` | Customer | Update `{ "quantity": 2 }` |
| DELETE | `/api/cart/items/:productId` | Customer | Remove cart item |
| DELETE | `/api/cart` | Customer | Clear cart |
| GET | `/api/wishlist` | Customer | View wishlist |
| POST | `/api/wishlist` | Customer | Add `{ "productId": "..." }` |
| DELETE | `/api/wishlist/:productId` | Customer | Remove wishlist item |
| GET | `/api/addresses` | Customer | List addresses |
| POST | `/api/addresses` | Customer | Create address |
| PUT | `/api/addresses/:id` | Customer | Update own address |
| DELETE | `/api/addresses/:id` | Customer | Delete own address |
| GET | `/api/coupons` | Admin | List coupons |
| POST | `/api/coupons` | Admin | Create coupon |
| PUT | `/api/coupons/:id` | Admin | Update coupon |
| DELETE | `/api/coupons/:id` | Admin | Delete coupon |
| POST | `/api/orders` | Customer | Create order from cart |
| GET | `/api/orders/my` | Customer | My orders |
| GET | `/api/orders` | Admin | All orders |
| GET | `/api/orders/:id` | Owner/Admin | Order details |
| PATCH | `/api/orders/:id/cancel` | Customer | Cancel eligible pending order |
| PATCH | `/api/orders/:id/status` | Admin | Set confirmed/processing/shipped/delivered |
| POST | `/api/payments/sslcommerz/:orderId/init` | Customer | Create SSLCommerz payment session |
| GET | `/api/payments/:id` | Owner/Admin | Payment details |
| PATCH | `/api/payments/:id/review` | Admin | Approve/reject a risk-held payment after manual verification |
| POST | `/api/payments/sslcommerz/success` | SSLCommerz | Success callback |
| POST | `/api/payments/sslcommerz/fail` | SSLCommerz | Failure callback |
| POST | `/api/payments/sslcommerz/cancel` | SSLCommerz | Cancel callback |
| POST | `/api/payments/sslcommerz/ipn` | SSLCommerz | IPN listener |
| GET | `/api/products/:productId/reviews` | Public | Product reviews |
| POST | `/api/products/:productId/reviews` | Customer | Review purchased product |
| DELETE | `/api/reviews/:id` | Owner/Admin | Delete review |

## Example product and category setup

First, create a category using an admin token:

```http
POST /api/categories
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json
```

```json
{
  "name": "Electronics",
  "description": "Electronic products"
}
```

Then create a product. Use the returned category MongoDB `_id`:

```http
POST /api/products
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json
```

```json
{
  "name": "Wireless Headphones",
  "description": "Bluetooth headphones",
  "price": 2500,
  "stock": 20,
  "category": "CATEGORY_OBJECT_ID",
  "images": ["https://example.com/headphones.jpg"]
}
```

## Checkout and SSLCommerz payment flow

### 1. Save a shipping address

`POST /api/addresses`

```json
{
  "fullName": "Demo Customer",
  "phone": "01700000000",
  "address": "House 10, Road 2",
  "city": "Dhaka",
  "postalCode": "1207",
  "country": "Bangladesh",
  "isDefault": true
}
```

### 2. Add products to cart

`POST /api/cart/items`

```json
{
  "productId": "PRODUCT_OBJECT_ID",
  "quantity": 1
}
```

### 3. Create order

`POST /api/orders`

```json
{
  "addressId": "ADDRESS_OBJECT_ID",
  "couponCode": "WELCOME10"
}
```

The backend calculates product prices, discounts, shipping and total from MongoDB. Do not send a trusted total from the browser.

### 4. Start SSLCommerz payment

`POST /api/payments/sslcommerz/ORDER_OBJECT_ID/init`

The response includes `gatewayUrl`. Redirect the customer to that URL. SSLCommerz hosts the payment page; this API never collects or stores card number or CVV.

### 5. Payment verification

The backend receives SSLCommerz success/fail/cancel callbacks and IPN. It calls the SSLCommerz server-side validation or transaction-query API, then checks the transaction ID, amount, currency and risk level before marking an order paid. Risk level `1` is held for manual review.

## SSLCommerz Sandbox Setup

1. Create a sandbox merchant account: https://sandbox-gw.sslcommerz.com/register
2. Copy the sandbox Store ID and Store Password into `.env`.
3. Keep `SSLCommerz_IS_LIVE=false` while testing.
4. Deploy the API or expose your local server through a secure public HTTPS tunnel (for example, ngrok). SSLCommerz must be able to reach the callback URLs.
5. Set `APP_BASE_URL` to the public backend origin only, without a trailing slash. Example: `https://your-api-domain.example`.
6. In the SSLCommerz sandbox merchant panel, enable the HTTP IPN listener and set it to `https://your-api-domain.example/api/payments/sslcommerz/ipn`.
7. Run a test order and complete payment on the SSLCommerz hosted page.
8. Confirm the payment and order status in MongoDB.

Use only sandbox credentials and test transactions during development. For production, use live credentials, `SSLCommerz_IS_LIVE=true`, HTTPS, production deployment, and the live merchant IPN configuration. Never put Store Password or JWT secret in frontend code or GitHub.

## Important notes / production hardening

- This is a learning starter, not a fully audited production commerce platform.
- Use HTTPS in production and keep secrets in the hosting provider's environment settings.
- Configure rate limiting, request logging, CORS policy if a browser frontend calls the API, email verification, password reset and monitoring before production.
- Checkout uses MongoDB transactions to reserve stock and claim coupon usage atomically. MongoDB Atlas transactions require a replica-set-capable cluster.
- Unpaid stock reservations expire after 30 minutes. A server-side cleanup job releases stock and coupon usage. Keep the API process running or move this cleanup to a dedicated worker in a multi-instance deployment.
- IPN and browser callbacks are idempotently processed through server-side transaction validation; never trust the browser redirect as proof of payment.
- Add refund API workflow and reconciliation before accepting live orders.
- SSLCommerz callback URLs must be publicly reachable. `localhost` alone cannot receive IPN notifications.

## Build

```bash
npm run typecheck
npm run build
npm start
```

---

Built with Node.js, TypeScript, MongoDB Atlas and SSLCommerz.
