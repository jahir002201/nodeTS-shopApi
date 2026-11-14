import type {
  IncomingMessage,
  ServerResponse
} from "http";

import productController from "../controllers/product.controller";

import { sendResponse } from "../utils/sendResponse";

const routeHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => {

  const url = req.url;
  const method = req.method;

  // Root Route
  if (url === "/" && method === "GET") {
    sendResponse(
      res,
      true,
      200,
      "This is root route!!"
    );

  // Product Routes
  } else if (url?.startsWith("/products")) {

    productController(req, res);

  // Not Found
  } else {

    sendResponse(
      res,
      false,
      404,
      "This route is not defined!"
    );

  }
};

export default routeHandler;
