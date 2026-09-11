import { date, pgTable, uuid, varchar, pgEnum } from "drizzle-orm/pg-core";

export const icdChapterEnum = pgEnum("icd_chapter", [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
  "XVI",
  "XVII",
  "XVIII",
  "XIX",
  "XX",
  "XXI",
  "XXII",
]);

export const diagnoses = pgTable("diagnoses", {
  id: uuid("id").defaultRandom().primaryKey(),
  icdCode: varchar("icd_code", { length: 10 }).notNull().unique(),
  description: varchar("description", { length: 255 }).notNull(),
  chapter: icdChapterEnum("chapter").notNull(),
});

export type Diagnosis = typeof diagnoses.$inferSelect;
export type NewDiagnosis = typeof diagnoses.$inferInsert;
