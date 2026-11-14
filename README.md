# NodeTS Shop API ⚡

A RESTful Product API built using **native Node.js HTTP module** and **TypeScript**, without Express or any third-party web framework.

This project demonstrates how to create an HTTP server, handle requests and responses, parse JSON request bodies, and perform CRUD operations using a JSON file as a mock database.

## 🚀 Features

- Native Node.js HTTP server using `http` module
- TypeScript for type safety
- RESTful API architecture
- Product CRUD operations
- Stream-based JSON body parser
- Reusable response formatter
- JSON file-based data storage
- Development server with `tsx` hot reloading
- Environment variable configuration with `dotenv`

## 📂 Project Structure

```text
nodeTS-shopApi/
├── package.json
├── package-lock.json
├── tsconfig.json
├── .env
├── .gitignore
└── src/
    ├── server.ts
    ├── config/
    │   └── index.ts
    ├── controllers/
    │   └── product.controller.ts
    ├── database/
    │   └── db.json
    ├── routes/
    │   └── route.ts
    ├── service/
    │   └── product.service.ts
    ├── types/
    │   └── product.ts
    └── utils/
        ├── parseBody.ts
        └── sendResponse.ts
```

## 🛠️ Technologies Used

- Node.js
- TypeScript
- Native HTTP Module
- JSON
- dotenv
- tsx

## 📡 API Endpoints

| Method | Endpoint | Description |
|:---:|---|---|
| GET | `/` | Root health check |
| GET | `/products` | Get all products |
| GET | `/products/:id` | Get a single product |
| POST | `/products` | Create a new product |
| PUT | `/products/:id` | Update a product |
| DELETE | `/products/:id` | Delete a product |

## ⚙️ Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/jahir002201/nodeTS-shopApi.git
```

### 2. Navigate to the Project Directory

```bash
cd nodeTS-shopApi
npm init -y
npm i -D typescript
npm tsx --init
npm i tsx
```

### 3. Install Dependencies

```bash
npm install
npm install dotenv
```

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
```

### 5. Start the Development Server

```bash
npm run dev
```

The server will run at:

```text
http://localhost:5000
```

## 🧪 Testing the API

You can test the API using **Postman**, **Thunder Client**, or any HTTP client.

### Get All Products

```http
GET http://localhost:5000/products
```

### Get Single Product

```http
GET http://localhost:5000/products/2
```

### Create a Product

```http
POST http://localhost:5000/products
Content-Type: application/json
```

Request Body:

```json
{
  "name": "Laptop",
  "price": 1200
}
```

### Update a Product

```http
PUT http://localhost:5000/products/2
Content-Type: application/json
```

Request Body:

```json
{
  "name": "Updated Laptop",
  "price": 1500
}
```

### Delete a Product

```http
DELETE http://localhost:5000/products/2
```

## 🧠 What I Learned

- Creating an HTTP server using Node.js native APIs
- Understanding `IncomingMessage` and `ServerResponse`
- Handling HTTP methods and URL parameters
- Parsing request bodies using streams
- Organizing code with controllers, routes, and services
- Implementing CRUD operations
- Working with TypeScript interfaces
- Reading and writing JSON files using Node.js `fs` module

## 📌 Project Scope

This project was developed as part of a Node.js and TypeScript learning module. It focuses on understanding how REST APIs work internally without using Express or other web frameworks.

---

**Built with ❤️ using Node.js and TypeScript.**