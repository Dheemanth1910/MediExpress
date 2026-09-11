import { z } from "zod";
import { medicineCategoryEnum } from "../entities/medicine.entity";
import { icdChapterEnum } from "../entities/diagnosis.entity";

const medicineSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    category: z.enum(medicineCategoryEnum.enumValues),
    expiryDate: z.string().date(),
  })
  .strict();

const diagnosisSchema = z
  .object({
    icdCode: z.string().trim().min(3).max(10),
    description: z.string().trim().min(1).max(255),
    chapter: z.enum(icdChapterEnum.enumValues),
  })
  .strict();

const medicineDiagnosisSchema = z
  .object({
    medicineId: z.string().uuid(),
    diagnosisId: z.string().uuid(),
  })
  .strict();

export const createMedicinesRequestSchema = z.array(medicineSchema).min(1);
export const createDiagnosesRequestSchema = z.array(diagnosisSchema).min(1);
export const createMedicineDiagnosesRequestSchema = z
  .array(medicineDiagnosisSchema)
  .min(1);

export const medicineResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.enum(medicineCategoryEnum.enumValues),
  expiryDate: z.string().date().nullable(),
});

export const diagnosisResponseSchema = z.object({
  id: z.string().uuid(),
  icdCode: z.string(),
  description: z.string(),
  chapter: z.enum(icdChapterEnum.enumValues),
});

export const medicineDiagnosisResponseSchema = z.object({
  medicineId: z.string().uuid(),
  diagnosisId: z.string().uuid(),
});

const medicineCreationResultSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    data: medicineResponseSchema,
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    input: medicineSchema, // echo back what was submitted, so caller knows which one failed
  }),
]);

const diagnosisCreationResultSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: diagnosisResponseSchema }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    input: diagnosisSchema,
  }),
]);

const medicineDiagnosisCreationResultSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), data: medicineDiagnosisResponseSchema }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    input: medicineDiagnosisSchema,
  }),
]);

export const createDiagnosesResponseSchema = z.array(
  diagnosisCreationResultSchema,
);
export const createMedicineDiagnosesResponseSchema = z.array(
  medicineDiagnosisCreationResultSchema,
);

export const createMedicinesResponseSchema = z.array(
  medicineCreationResultSchema,
);

export type CreateMedicinesRequest = z.infer<
  typeof createMedicinesRequestSchema
>;
export type CreateDiagnosesRequest = z.infer<
  typeof createDiagnosesRequestSchema
>;
export type CreateMedicineDiagnosesRequest = z.infer<
  typeof createMedicineDiagnosesRequestSchema
>;
export type MedicineResponse = z.infer<typeof medicineResponseSchema>;
export type DiagnosisResponse = z.infer<typeof diagnosisResponseSchema>;
export type MedicineDiagnosisResponse = z.infer<
  typeof medicineDiagnosisResponseSchema
>;