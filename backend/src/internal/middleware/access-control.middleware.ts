import { NextFunction, Request, Response } from "express";
import { Permission } from "../services/rbac/permission";
import { RbacService } from "../services/rbac/rbac.service";

export interface RbacPrincipal {
  subTenantId: string | null;
  roles: number[];
}

export type PrincipalResolver = (req: Request) => RbacPrincipal | undefined | Promise<RbacPrincipal | undefined>;

const defaultPrincipalResolver: PrincipalResolver = (req) => {
  return req.auth;
};

export const accessControlMiddlewareGenerator = (
  service: RbacService,
  resolvePrincipal: PrincipalResolver = defaultPrincipalResolver,
) => (...requiredPermissions: Permission[]) => async (req: Request, res: Response, next: NextFunction) => {
  const principal = await resolvePrincipal(req);
  if (!principal) return res.status(401).json({ error: "Invalid session" });

  const allowed = await service.hasAllPermissions(
    principal.subTenantId,
    principal.roles,
    requiredPermissions,
  );
  if (!allowed) return res.status(403).json({ error: "Access Denied" });
  return next();
};

export const requirePermissions = (
  service: RbacService,
  ...requiredPermissions: Permission[]
) => accessControlMiddlewareGenerator(service)(...requiredPermissions);
