import { NextFunction, Request, Response } from "express";
import { AuthService } from "../services/user/auth.service";

export const bearerToken = (header: string | undefined) => {
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : undefined;
};

export const createAuthenticateMiddleware = (authService: AuthService) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const token = bearerToken(req.header("authorization"));
    if (!token) return res.status(401).json({ error: "Missing authentication token" });

    const auth = await authService.authenticate(token);
    if (!auth) return res.status(401).json({ error: "Invalid or expired session" });

    req.auth = auth;
    return next();
  };
