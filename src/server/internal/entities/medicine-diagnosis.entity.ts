import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { medicines } from "./medicine.entity";
import { diagnoses } from "./diagnosis.entity";

export const medicineDiagnoses = pgTable(
  "medicine_diagnoses",
  {
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id),
    diagnosisId: uuid("diagnosis_id")
      .notNull()
      .references(() => diagnoses.id),
  },
  (table) => [primaryKey({ columns: [table.medicineId, table.diagnosisId] })],
);

export type MedicineDiagnosis = typeof medicineDiagnoses.$inferSelect;
export type NewMedicineDiagnosis = typeof medicineDiagnoses.$inferInsert;
