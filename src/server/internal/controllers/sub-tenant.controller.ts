import { Request, Response } from "express";
import { createSubTenantRequestSchema } from "../../../shared/dtos/sub-tenant.dto";
import { SubTenantService, SubTenantServiceError } from "../services/sub-tenant/sub-tenant.service";

export class SubTenantController {
  constructor(private readonly service: SubTenantService) {}

  async list(req: Request, res: Response) {
    try { return res.json(await this.service.list(typeof req.query.tenantId === "string" ? req.query.tenantId : undefined)); }
    catch (error) { return this.handleError(res, error); }
  }

  async get(req: Request, res: Response) {
    try { return res.json(await this.service.get(req.params.id as string)); }
    catch (error) { return this.handleError(res, error); }
  }

  async create(req: Request, res: Response) {
    const parsed = createSubTenantRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    try { return res.status(201).json(await this.service.create(parsed.data)); }
    catch (error) { return this.handleError(res, error); }
  }

  private handleError(res: Response, error: unknown) {
    if (error instanceof SubTenantServiceError) return res.status(error.statusCode).json({ error: error.message });
    console.error("Subtenant request failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
