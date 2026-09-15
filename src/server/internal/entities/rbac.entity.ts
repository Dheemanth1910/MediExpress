import { integer, jsonb, pgTable, serial, uuid, varchar } from "drizzle-orm/pg-core";
import { Permission } from "../services/rbac/permission";

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  subTenantId: uuid("sub_tenant_id"),
  name: varchar("name", { length: 255 }).notNull(),
  permissions: jsonb("permissions").$type<Permission[]>().notNull().default([]),
});

export const permissions = pgTable("permissions", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type PermissionRecord = typeof permissions.$inferSelect;
