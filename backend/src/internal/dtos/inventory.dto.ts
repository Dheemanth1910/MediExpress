import { z } from "zod";

export const createInventoryRequestSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  quantity: z.number().int().nonnegative().default(0),
}).strict();

export type CreateInventoryRequest = z.infer<typeof createInventoryRequestSchema>;
