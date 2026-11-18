import type { ServerResponse } from "http";

export const sendResponse = (
  res: ServerResponse,
  success: boolean,
  statusCode: number,
  message: string,
  data?: unknown,
) => {
  const response: { success: boolean; message: string; data?: unknown } = { success, message };
  if (data !== undefined) response.data = data;
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(response));
};
