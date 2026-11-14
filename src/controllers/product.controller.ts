import type { IncomingMessage, ServerResponse } from "http";

import {
  createProduct,
  productService
} from "../service/product.service";

import type { IProduct } from "../types/product";

import { bodyParser } from "../utils/parseBody";
import { sendResponse } from "../utils/sendResponse";

const productController = async (
  req: IncomingMessage,
  res: ServerResponse
) => {

  const url = req.url;
  const method = req.method;

  const urlParams = url?.split("/");

  const id =
    urlParams && urlParams[1] === "products"
      ? Number(urlParams[2])
      : null;

  // Get All Product
  if (url === "/products" && method === "GET") {
    try {
      const products = productService();

      sendResponse(
        res,
        true,
        200,
        "Products retrieved successfully!",
        products
      );
    } catch (error) {
      sendResponse(res, false, 500, "Internal server error");
    }

  // Get Single Product
  } else if (
    method === "GET" &&
    id !== null &&
    Number.isFinite(id)
  ) {
    try {
      const products = productService();

      const product = products.find(
        (p: IProduct) => p.id === id
      );

      if (!product) {
        return sendResponse(
          res,
          false,
          404,
          "Product not found!"
        );
      }

      sendResponse(
        res,
        true,
        200,
        "Product retrieved successfully!",
        product
      );

    } catch (error) {
      sendResponse(res, false, 500, "Internal server error");
    }

  // Create Product
  } else if (
    method === "POST" &&
    url === "/products"
  ) {
    try {
      const body = await bodyParser(req);

      const newProduct: IProduct = {
        id: Date.now(),
        ...body,
      };

      const products = productService();

      products.push(newProduct);

      createProduct(products);

      sendResponse(
        res,
        true,
        201,
        "Product created successfully!",
        newProduct
      );

    } catch (error) {
      sendResponse(
        res,
        false,
        400,
        "Invalid request body!"
      );
    }

  // Update Product
  } else if (
    method === "PUT" &&
    id !== null &&
    Number.isFinite(id)
  ) {
    try {
      const body = await bodyParser(req);

      const products = productService();

      const index = products.findIndex(
        (p: IProduct) => p.id === id
      );

      if (index < 0) {
        return sendResponse(
          res,
          false,
          404,
          "Product Not Found!"
        );
      }

      const existingProduct = products[index];

      if (!existingProduct) {
        return sendResponse(
          res,
          false,
          404,
          "Product Not Found!"
        );
      }

      products[index] = {
        id: existingProduct.id,
        ...body,
      };

      createProduct(products);

      sendResponse(
        res,
        true,
        200,
        "Product updated successfully!",
        products[index]
      );

    } catch (error) {
      sendResponse(
        res,
        false,
        400,
        "Invalid request body!"
      );
    }

  // Delete Product
  } else if (
    method === "DELETE" &&
    id !== null &&
    Number.isFinite(id)
  ) {
    try {
      const products = productService();

      const index = products.findIndex(
        (p: IProduct) => p.id === id
      );

      if (index < 0) {
        return sendResponse(
          res,
          false,
          404,
          "Product Not Found!"
        );
      }

      products.splice(index, 1);

      createProduct(products);

      sendResponse(
        res,
        true,
        200,
        "Product deleted successfully!"
      );

    } catch (error) {
      sendResponse(
        res,
        false,
        500,
        "Internal server error"
      );
    }

  } else {
    sendResponse(
      res,
      false,
      404,
      "Product route not found!"
    );
  }
};

export default productController;
