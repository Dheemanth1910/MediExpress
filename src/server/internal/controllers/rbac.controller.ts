import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  createRoleRequestSchema,
  roleListQuerySchema,
  updateRoleRequestSchema,
} from "../../../shared/dtos/rbac.dto";
import { RbacService, RbacServiceError } from "../services/rbac/rbac.service";

const validationError = (error: ZodError) => ({
  error: "Invalid request",
  details: error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
});

const handleError = (res: Response, error: unknown) => {
  if (error instanceof RbacServiceError) return res.status(error.statusCode).json({ error: error.message });
  console.error("RBAC request failed", error);
  return res.status(500).json({ error: "Internal server error" });
};

export class RbacController {
  constructor(private readonly service: RbacService) {}

  async createRole(req: Request, res: Response) {
    const parsed = createRoleRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    try {
      return res.status(201).json(await this.service.createRole(parsed.data));
    } catch (error) {
      return handleError(res, error);
    }
  }

  async updateRole(req: Request, res: Response) {
    const parsed = updateRoleRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    try {
      return res.json(await this.service.updateRole(parsed.data));
    } catch (error) {
      return handleError(res, error);
    }
  }

  async listRoles(req: Request, res: Response) {
    const parsed = roleListQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json(validationError(parsed.error));
    try {
      return res.json(await this.service.listRoles(parsed.data.subTenantId));
    } catch (error) {
      return handleError(res, error);
    }
  }

  async listPermissions(_req: Request, res: Response) {
    try {
      return res.json(await this.service.listPermissions());
    } catch (error) {
      return handleError(res, error);
    }
  }
}
