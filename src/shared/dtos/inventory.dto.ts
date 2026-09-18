import { z } from "zod";

export const createInventoryRequestSchema = z.object({
  medicineId: z.string().uuid(),
  quantity: z.number().int().positive(),
  expiryDate: z.coerce.date(),
}).strict();

export const updateInventoryRequestSchema = z.object({
  id: z.string().uuid(),
  operation: z.enum(["add", "del"]),
  quantity: z.number().int().positive(),
  reason: z.string().trim().min(1).max(500).optional(),
  diagnosisCodes: z.array(z.string().trim().min(1).max(20)).optional(),
  createdAt: z.coerce.date().optional(),
}).strict().superRefine((input, context) => {
  if (input.operation === "add" && !input.reason) {
    context.addIssue({ code: "custom", path: ["reason"], message: "reason is required when adding stock" });
  }
  if (input.operation === "del" && (!input.diagnosisCodes || input.diagnosisCodes.length === 0)) {
    context.addIssue({ code: "custom", path: ["diagnosisCodes"], message: "diagnosisCodes are required when deleting stock" });
  }
});

export const bulkUpdateInventoryRequestSchema = z.array(updateInventoryRequestSchema).min(1).max(500);

export const inventoryQuerySchema = z.object({
  id: z.string().uuid().optional(),
  medicineId: z.string().uuid().optional(),
  query: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  sort: z.enum(["expiryDate", "medicineId"]).default("expiryDate"),
  order: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  limit: z.coerce.number().int().positive().max(100).optional(),
}).strict();

export const inventoryAuditQuerySchema = z.object({
  inventoryItemId: z.string().uuid().optional(),
  medicineId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  limit: z.coerce.number().int().positive().max(100).optional(),
}).strict().superRefine((input, context) => {
  if (input.from && input.to && input.from > input.to) {
    context.addIssue({ code: "custom", path: ["from"], message: "from must be before or equal to to" });
  }
});

export const inventoryItemResponseSchema = z.object({
  id: z.string().uuid(),
  subTenantId: z.string().uuid(),
  medicineId: z.string().uuid(),
  quantity: z.number().int().nonnegative(),
  expiryDate: z.coerce.date(),
});

export const inventoryListResponseSchema = z.object({
  data: z.array(inventoryItemResponseSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const inventoryAuditEntryResponseSchema = z.object({
  id: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  subTenantId: z.string().uuid(),
  operation: z.enum(["add", "del"]),
  quantity: z.number().int().positive(),
  reason: z.string().nullable(),
  diagnosisCodes: z.array(z.string()),
  createdAt: z.coerce.date(),
});

export const inventoryAuditResponseSchema = z.object({
  data: z.array(inventoryAuditEntryResponseSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export type CreateInventoryRequest = z.infer<typeof createInventoryRequestSchema>;
export type UpdateInventoryRequest = z.infer<typeof updateInventoryRequestSchema>;
export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;
export type InventoryAuditQuery = z.infer<typeof inventoryAuditQuerySchema>;
export type InventoryItemResponse = z.infer<typeof inventoryItemResponseSchema>;
export type InventoryAuditEntryResponse = z.infer<typeof inventoryAuditEntryResponseSchema>;
