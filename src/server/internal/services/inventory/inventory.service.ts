import { InventoryItem, NewInventoryItem } from "../../entities/inventory.entity";
import { NewInventoryMovement } from "../../entities/inventory-movement.entity";
import { CreateInventoryRequest, InventoryAuditEntryResponse, InventoryAuditQuery, InventoryItemResponse, InventoryQuery, UpdateInventoryRequest } from "../../../shared/dtos/inventory.dto";
import { DrizzleInventoryRepository, InventoryRepository } from "../../repositories/inventory.repository";

const toResponse = (item: InventoryItem): InventoryItemResponse => ({
  id: item.id,
  subTenantId: item.subTenantId,
  medicineId: item.medicineId,
  quantity: item.quantity,
  expiryDate: item.expiryDate,
});

const toAuditResponse = (movement: NewInventoryMovement & { id: string; createdAt: Date }): InventoryAuditEntryResponse => ({
  id: movement.id,
  inventoryItemId: movement.inventoryItemId,
  subTenantId: movement.subTenantId,
  operation: movement.operation as "add" | "del",
  quantity: movement.quantity,
  reason: movement.reason ?? null,
  diagnosisCodes: movement.diagnosisCodes ?? [],
  createdAt: movement.createdAt,
});

export class InventoryServiceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "InventoryServiceError";
  }
}

export class InventoryService {
  constructor(private readonly repository: InventoryRepository = new DrizzleInventoryRepository()) {}

  async list(query: InventoryQuery, subTenantId: string): Promise<{ data: InventoryItemResponse[]; page: number; pageSize: number; total: number }> {
    const pageSize = query.limit ?? query.pageSize;
    const result = await this.repository.find({
      ...query,
      subTenantId,
      offset: (query.page - 1) * pageSize,
      limit: pageSize,
    });
    return { data: result.data.map(toResponse), page: query.page, pageSize, total: result.total };
  }

  async get(id: string, subTenantId: string): Promise<InventoryItemResponse> {
    const item = await this.repository.findById(id, subTenantId);
    if (!item) throw new InventoryServiceError(404, "Inventory item not found");
    return toResponse(item);
  }

  async create(input: CreateInventoryRequest, subTenantId: string): Promise<InventoryItemResponse> {
    if (!(await this.repository.medicineExists(input.medicineId))) {
      throw new InventoryServiceError(404, "Medicine not found");
    }
    if (input.expiryDate <= new Date()) {
      throw new InventoryServiceError(400, "expiryDate must be in the future");
    }
    const newItem: NewInventoryItem = { ...input, subTenantId };
    return toResponse(await this.repository.create(newItem));
  }

  async update(input: UpdateInventoryRequest, subTenantId: string): Promise<InventoryItemResponse> {
    const item = await this.repository.findById(input.id, subTenantId);
    if (!item) throw new InventoryServiceError(404, "Inventory item not found");
    if (input.operation === "del" && input.quantity > item.quantity) {
      throw new InventoryServiceError(409, "Insufficient inventory quantity");
    }

    const movement: NewInventoryMovement = {
      inventoryItemId: item.id,
      subTenantId,
      operation: input.operation,
      quantity: input.quantity,
      reason: input.reason,
      diagnosisCodes: input.diagnosisCodes ?? [],
    };

    const updated = await this.repository.adjustQuantity(movement);
    if (!updated) throw new InventoryServiceError(409, "Inventory quantity could not be updated");

    return toResponse(updated);
  }

  async audit(query: InventoryAuditQuery, subTenantId: string): Promise<{ data: InventoryAuditEntryResponse[]; page: number; pageSize: number; total: number }> {
    const pageSize = query.limit ?? query.pageSize;
    const result = await this.repository.findAudit({
      ...query,
      subTenantId,
      offset: (query.page - 1) * pageSize,
      limit: pageSize,
    });
    return { data: result.data.map(toAuditResponse), page: query.page, pageSize, total: result.total };
  }
}
