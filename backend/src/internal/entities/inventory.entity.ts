import { integer, pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { medicines } from "./medicine.entity";
import { tenants } from "./tenant.entity";

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  subTenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  quantity: integer("quantity").default(0).notNull(),
  medicineId: uuid("medicine_id").notNull().references(() => medicines.id),
  expiryDate: timestamp("expiry_date", { mode: "date" }).notNull(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
