import { date, pgTable, uuid, varchar , pgEnum } from "drizzle-orm/pg-core";


export const medicineCategoryEnum = pgEnum("medicine_category", [
  "A",
  "B",
  "C",
  "D",
  "G",
  "H",
  "J",
  "L",
  "M",
  "N",
  "P",
  "R",
  "S",
  "V",
]);

export const medicines = pgTable("medicines", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: medicineCategoryEnum("category").notNull(),
});

export type Medicine = typeof medicines.$inferSelect;
export type NewMedicine = typeof medicines.$inferInsert;
