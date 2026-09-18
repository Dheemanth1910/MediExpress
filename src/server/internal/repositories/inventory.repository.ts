import { and, asc, desc, eq, gte, ilike, lte, gt, sql } from "drizzle-orm";
import { db, type Database } from "../../db/client";
import { v7 as uuidv7 } from "uuid";
import {
  InventoryItem,
  NewInventoryItem,
  inventoryItems,
} from "../entities/inventory.entity";
import {
  InventoryMovement,
  NewInventoryMovement,
  inventoryMovements,
} from "../entities/inventory-movement.entity";

import { medicines } from "../entities/medicine.entity";

export interface InventoryFilters {
  subTenantId: string;
  id?: string;
  medicineId?: string;
  query?: string;
  category?: string;
  sort: "expiryDate" | "medicineId";
  order: "asc" | "desc";
  offset: number;
  limit: number;
}

export interface InventoryListResult {
  data: InventoryItem[];
  total: number;
}

export interface InventoryAuditFilters {
  subTenantId: string;
  inventoryItemId?: string;
  medicineId?: string;
  from?: Date;
  to?: Date;
  offset: number;
  limit: number;
}

export interface InventoryAuditResult {
  data: InventoryMovement[];
  total: number;
}

export type InventoryMovementInput = Omit<NewInventoryMovement, "id">;

export interface InventorySyncResult {
  id: string; 
  inventoryItemId: string;
  subTenantId: string;
  medicineName: string,
  medicineCategory: string,
  quantity: number;
  reason: string | null;
  diagnosisCodes: string[];
  createdAt: string;
}

export interface InventoryRepository {
  find(filters: InventoryFilters): Promise<InventoryListResult>;
  findById(id: string, subTenantId: string): Promise<InventoryItem | undefined>;
  medicineExists(id: string): Promise<boolean>;
  create(input: NewInventoryItem): Promise<InventoryItem>;
  adjustQuantity(
    input: InventoryMovementInput,
  ): Promise<InventoryItem | undefined>;
  findAudit(filters: InventoryAuditFilters): Promise<InventoryAuditResult>;
  getSyncDataForBigQuery(
    id: string | null,
    subTenantId: string,
    limit: number,
  ): Promise<InventorySyncResult[]>;
}

export class DrizzleInventoryRepository implements InventoryRepository {
  constructor(private readonly database: Database = db) {}

  async find(filters: InventoryFilters) {
    const conditions = [eq(inventoryItems.subTenantId, filters.subTenantId)];
    if (filters.id) conditions.push(eq(inventoryItems.id, filters.id));
    if (filters.medicineId)
      conditions.push(eq(inventoryItems.medicineId, filters.medicineId));
    if (filters.query)
      conditions.push(ilike(medicines.name, `%${filters.query}%`));
    if (filters.category)
      conditions.push(
        eq(
          medicines.category,
          filters.category as (typeof medicines.category.enumValues)[number],
        ),
      );

    const orderColumn =
      filters.sort === "medicineId"
        ? inventoryItems.medicineId
        : inventoryItems.expiryDate;
    const orderBy =
      filters.order === "desc" ? desc(orderColumn) : asc(orderColumn);
    const rows = await this.database
      .select({ item: inventoryItems })
      .from(inventoryItems)
      .innerJoin(medicines, eq(inventoryItems.medicineId, medicines.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(filters.limit)
      .offset(filters.offset);
    const [{ count }] = await this.database
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .innerJoin(medicines, eq(inventoryItems.medicineId, medicines.id))
      .where(and(...conditions));

    return { data: rows.map(({ item }) => item), total: Number(count) };
  }

  async findById(id: string, subTenantId: string) {
    const [row] = await this.database
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.id, id),
          eq(inventoryItems.subTenantId, subTenantId),
        ),
      );
    return row;
  }

  async medicineExists(id: string) {
    const [medicine] = await this.database
      .select({ id: medicines.id })
      .from(medicines)
      .where(eq(medicines.id, id));
    return Boolean(medicine);
  }

  async create(input: NewInventoryItem) {
    const [item] = await this.database
      .insert(inventoryItems)
      .values({ ...input, id: uuidv7() })
      .returning();
    return item;
  }

  async adjustQuantity(input: NewInventoryMovement) {
    return this.database.transaction(async (transaction) => {
      const [item] = await transaction
        .select()
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.id, input.inventoryItemId),
            eq(inventoryItems.subTenantId, input.subTenantId),
          ),
        );
      if (!item) return undefined;

      const nextQuantity =
        input.operation === "add"
          ? item.quantity + input.quantity
          : item.quantity - input.quantity;
      if (nextQuantity < 0) return undefined;

      const [updated] = await transaction
        .update(inventoryItems)
        .set({ quantity: nextQuantity })
        .where(eq(inventoryItems.id, item.id))
        .returning();
      await transaction
        .insert(inventoryMovements)
        .values({ ...input, id: uuidv7() });
      return updated;
    });
  }

  async findAudit(
    filters: InventoryAuditFilters,
  ): Promise<InventoryAuditResult> {
    const conditions = [
      eq(inventoryMovements.subTenantId, filters.subTenantId),
    ];
    if (filters.inventoryItemId)
      conditions.push(
        eq(inventoryMovements.inventoryItemId, filters.inventoryItemId),
      );
    if (filters.medicineId)
      conditions.push(eq(inventoryItems.medicineId, filters.medicineId));
    if (filters.from)
      conditions.push(gte(inventoryMovements.createdAt, filters.from));
    if (filters.to)
      conditions.push(lte(inventoryMovements.createdAt, filters.to));

    const data = await this.database
      .select({ movement: inventoryMovements })
      .from(inventoryMovements)
      .innerJoin(
        inventoryItems,
        eq(inventoryMovements.inventoryItemId, inventoryItems.id),
      )
      .where(and(...conditions))
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(filters.limit)
      .offset(filters.offset);
    const [{ count }] = await this.database
      .select({ count: sql<number>`count(*)` })
      .from(inventoryMovements)
      .innerJoin(
        inventoryItems,
        eq(inventoryMovements.inventoryItemId, inventoryItems.id),
      )
      .where(and(...conditions));

    return { data: data.map(({ movement }) => movement), total: Number(count) };
  }

  async getSyncDataForBigQuery(id: string | null, subTenantId: string, limit: number) {
    const rows = await this.database
      .select({
        id: inventoryMovements.id,
        inventoryItemId: inventoryMovements.inventoryItemId,
        medicineName: medicines.name,
        medicineCategory: medicines.category,
        subTenantId: inventoryMovements.subTenantId,
        quantity: inventoryMovements.quantity,
        reason: inventoryMovements.reason,
        diagnosisCodes: inventoryMovements.diagnosisCodes,
        createdAt: inventoryMovements.createdAt,
      })
      .from(inventoryMovements)
      .innerJoin(medicines, eq(inventoryMovements.inventoryItemId, medicines.id))
      .where(
        and(
          eq(inventoryMovements.operation, "DEL"), // Create constant for DEL and replace everywhere
          eq(inventoryMovements.subTenantId, subTenantId),
          id ? gt(inventoryMovements.id, id) : undefined,
        ),
      )
      .orderBy(inventoryMovements.id)
      .limit(limit);

    return rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
    }));
  }
}
