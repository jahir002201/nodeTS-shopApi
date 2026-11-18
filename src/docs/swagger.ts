import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join, basename } from "node:path";

import openApiDocument from "./openapi.js";

const require = createRequire(import.meta.url);

const swaggerUiDist = require("swagger-ui-dist") as {
  getAbsoluteFSPath: () => string;
};

const swaggerAssetsPath = swaggerUiDist.getAbsoluteFSPath();

const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NodeTS Shop API Documentation</title>
  <link rel="stylesheet" href="/api-docs/swagger-ui.css" />
  <link rel="icon" type="image/png" href="/api-docs/favicon-32x32.png" />
</head>
<body>
  <div id="swagger-ui"></div>

  <script src="/api-docs/swagger-ui-bundle.js"></script>
  <script src="/api-docs/swagger-ui-standalone-preset.js"></script>

  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
`;

const assetFiles = new Set([
  "swagger-ui.css",
  "swagger-ui-bundle.js",
  "swagger-ui-standalone-preset.js",
  "favicon-32x32.png",
  "favicon-16x16.png",
]);

const getContentType = (fileName: string): string => {
  if (fileName.endsWith(".css")) return "text/css";
  if (fileName.endsWith(".js")) return "application/javascript";
  if (fileName.endsWith(".png")) return "image/png";

  return "application/octet-stream";
};

const swaggerHandler = (
  req: IncomingMessage,
  res: ServerResponse
): boolean => {
  const pathname = new URL(
    req.url ?? "/",
    `http://${req.headers.host ?? "localhost"}`
  ).pathname;

  if (req.method !== "GET") {
    return false;
  }

  // Swagger UI page
  if (pathname === "/api-docs" || pathname === "/api-docs/") {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
    });

    res.end(swaggerHtml);
    return true;
  }

  // OpenAPI JSON document
  if (pathname === "/openapi.json") {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });

    res.end(JSON.stringify(openApiDocument));
    return true;
  }

  // Swagger static assets
  if (pathname.startsWith("/api-docs/")) {
    const fileName = basename(pathname);

    if (!assetFiles.has(fileName)) {
      res.writeHead(404, {
        "Content-Type": "text/plain",
      });

      res.end("Swagger asset not found");
      return true;
    }

    try {
      const filePath = join(swaggerAssetsPath, fileName);
      const file = readFileSync(filePath);

      res.writeHead(200, {
        "Content-Type": getContentType(fileName),
        "Cache-Control": "public, max-age=86400",
      });

      res.end(file);
    } catch {
      res.writeHead(404, {
        "Content-Type": "text/plain",
      });

      res.end("Swagger asset not found");
    }

    return true;
  }

  return false;
};

export default swaggerHandler;
