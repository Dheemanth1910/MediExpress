import { InventoryItem, NewInventoryItem } from "../../entities/inventory.entity";
import { CreateInventoryRequest } from "../../dtos/inventory.dto";
import { DrizzleInventoryRepository, InventoryRepository } from "../../repositories/inventory.repository";

export class InventoryService {
  constructor(private readonly repository: InventoryRepository = new DrizzleInventoryRepository()) {}

  list(): Promise<InventoryItem[]> { return this.repository.findAll(); }

  async get(id: string): Promise<InventoryItem> {
    const item = await this.repository.findById(id);
    if (!item) throw new InventoryServiceError(404, "Inventory item not found");
    return item;
  }

  create(input: CreateInventoryRequest): Promise<InventoryItem> {
    const newItem: NewInventoryItem = input;
    return this.repository.create(newItem);
  }
}

export class InventoryServiceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "InventoryServiceError";
  }
}
