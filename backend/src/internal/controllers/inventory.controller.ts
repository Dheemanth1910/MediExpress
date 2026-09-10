import { Request, Response } from "express";
import { createInventoryRequestSchema } from "../dtos/inventory.dto";
import { InventoryService, InventoryServiceError } from "../services/inventory/inventory.service";

export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  async list(_req: Request, res: Response) {
    try { return res.json(await this.service.list()); }
    catch (error) { return this.handleError(res, error); }
  }

  async get(req: Request, res: Response) {
    try { return res.json(await this.service.get(req.params.id as string)); }
    catch (error) { return this.handleError(res, error); }
  }

  async create(req: Request, res: Response) {
    const parsed = createInventoryRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    try { return res.status(201).json(await this.service.create(parsed.data)); }
    catch (error) { return this.handleError(res, error); }
  }

  private handleError(res: Response, error: unknown) {
    if (error instanceof InventoryServiceError) return res.status(error.statusCode).json({ error: error.message });
    console.error("Inventory request failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
