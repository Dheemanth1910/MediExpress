import { integer, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { inventoryItems } from "./inventory.entity";
import { tenants } from "./tenant.entity";

export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id).notNull(),
  subTenantId: uuid("sub_tenant_id").references(() => tenants.id).notNull(),
  operation: varchar("operation", { length: 3 }).notNull(),
  quantity: integer("quantity").notNull(),
  reason: varchar("reason", { length: 500 }),
  diagnosisCodes: jsonb("diagnosis_codes").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type NewInventoryMovement = typeof inventoryMovements.$inferInsert;
