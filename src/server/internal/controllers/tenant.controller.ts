import { Request, Response } from "express";
import { createTenantRequestSchema } from "../dtos/tenant.dto";
import { TenantService, TenantServiceError } from "../services/tenant/tenant.service";

export class TenantController {
  constructor(private readonly service: TenantService) {}

  async list(_req: Request, res: Response) {
    try { return res.json(await this.service.list()); }
    catch (error) { return this.handleError(res, error); }
  }

  async get(req: Request, res: Response) {
    try { return res.json(await this.service.get(req.params.id as string)); }
    catch (error) { return this.handleError(res, error); }
  }

  async create(req: Request, res: Response) {
    const parsed = createTenantRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    try { return res.status(201).json(await this.service.create(parsed.data)); }
    catch (error) { return this.handleError(res, error); }
  }

  private handleError(res: Response, error: unknown) {
    if (error instanceof TenantServiceError) return res.status(error.statusCode).json({ error: error.message });
    console.error("Tenant request failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
