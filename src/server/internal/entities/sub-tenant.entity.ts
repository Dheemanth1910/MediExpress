import { pgTable, uuid, varchar, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenant.entity";

export const subTenants = pgTable("sub_tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),

  // Location
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  city:varchar("city", { length: 255 }).notNull(),
  district: varchar("district", { length: 255 }).notNull(),
  state: varchar("state", { length: 255 }).notNull(),
  country: varchar("country", { length: 255 }).notNull(),

  //tenant_id references tenants table
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SubTenant = typeof subTenants.$inferSelect;
export type NewSubTenant = typeof subTenants.$inferInsert;