import type { IncomingMessage } from "http";

export type RequestBody = Record<string, unknown>;

export const bodyParser = (req: IncomingMessage): Promise<RequestBody> => {
  let body = "";
  return new Promise((resolve, reject) => {
    req.on("data", (chunk: Buffer | string) => {
      body += chunk.toString();
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        const contentType = req.headers["content-type"] || "";
        if (contentType.includes("application/x-www-form-urlencoded")) {
          resolve(Object.fromEntries(new URLSearchParams(body).entries()));
        } else {
          const parsed: unknown = JSON.parse(body);
          if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            return reject(new Error("Request body must be a JSON object"));
          }
          resolve(parsed as RequestBody);
        }
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
};
