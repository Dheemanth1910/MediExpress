import { Request, Response } from "express";
import { bulkUpdateInventoryRequestSchema, createInventoryRequestSchema, inventoryAuditQuerySchema, inventoryQuerySchema, updateInventoryRequestSchema } from "../../../shared/dtos/inventory.dto";
import { InventoryService, InventoryServiceError } from "../services/inventory/inventory.service";

export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  async list(req: Request, res: Response) {
    const parsed = inventoryQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid query", details: parsed.error.issues });
    if (!req.auth?.subTenantId) return res.status(403).json({ error: "A tenant context is required" });
    try { return res.json(await this.service.list(parsed.data, req.auth.subTenantId)); }
    catch (error) { return this.handleError(res, error); }
  }

  async get(req: Request, res: Response) {
    if (!req.auth?.subTenantId) return res.status(403).json({ error: "A tenant context is required" });
    try { return res.json(await this.service.get(req.params.id as string, req.auth.subTenantId)); }
    catch (error) { return this.handleError(res, error); }
  }

  async audit(req: Request, res: Response) {
    const parsed = inventoryAuditQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid query", details: parsed.error.issues });
    if (!req.auth?.subTenantId) return res.status(403).json({ error: "A tenant context is required" });
    try { return res.json(await this.service.audit(parsed.data, req.auth.subTenantId)); }
    catch (error) { return this.handleError(res, error); }
  }

  async create(req: Request, res: Response) {
    const parsed = createInventoryRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    if (!req.auth?.subTenantId) return res.status(403).json({ error: "A tenant context is required" });
    try { return res.status(201).json(await this.service.create(parsed.data, req.auth.subTenantId)); }
    catch (error) { return this.handleError(res, error); }
  }

  async update(req: Request, res: Response) {
    const parsed = updateInventoryRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    if (!req.auth?.subTenantId) return res.status(403).json({ error: "A tenant context is required" });
    try { return res.json(await this.service.update(parsed.data, req.auth.subTenantId)); }
    catch (error) { return this.handleError(res, error); }
  }

  async bulkUpdate(req: Request, res: Response) {
    const parsed = bulkUpdateInventoryRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    if (!req.auth?.subTenantId) return res.status(403).json({ error: "A tenant context is required" });
    try { return res.json(await this.service.bulkUpdate(parsed.data, req.auth.subTenantId)); }
    catch (error) { return this.handleError(res, error); }
  }

  private handleError(res: Response, error: unknown) {
    if (error instanceof InventoryServiceError) return res.status(error.statusCode).json({ error: error.message });
    console.error("Inventory request failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
