import { jsonb, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { subTenants } from "./sub-tenant.entity";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subTenant: uuid("sub_tenant").references(() => subTenants.id),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 128 }).notNull(),
  salt: varchar("salt", { length: 64 }).notNull(),
  roles: jsonb("roles").$type<number[]>().notNull().default([]),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
