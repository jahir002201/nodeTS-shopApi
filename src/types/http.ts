import type { IncomingMessage } from "http";

export type UserRole = "admin" | "customer";
export interface AuthUser {
  id: string;
  role: UserRole;
  email: string;
}
export type AppRequest = IncomingMessage & {
  params?: Record<string, string>;
  user?: AuthUser;
};
export type RouteHandler = (req: AppRequest, res: import("http").ServerResponse) => Promise<void> | void;
