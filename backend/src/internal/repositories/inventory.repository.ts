import { eq } from "drizzle-orm";
import { db, type Database } from "../../db/client";
import { InventoryItem, NewInventoryItem, inventoryItems } from "../entities/inventory.entity";

export interface InventoryRepository {
  findAll(): Promise<InventoryItem[]>;
  findById(id: string): Promise<InventoryItem | undefined>;
  create(input: NewInventoryItem): Promise<InventoryItem>;
}

export class DrizzleInventoryRepository implements InventoryRepository {
  constructor(private readonly database: Database = db) {}

  findAll() { return this.database.select().from(inventoryItems); }

  async findById(id: string) {
    const [item] = await this.database.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }

  async create(input: NewInventoryItem) {
    const [item] = await this.database.insert(inventoryItems).values(input).returning();
    return item;
  }
}
