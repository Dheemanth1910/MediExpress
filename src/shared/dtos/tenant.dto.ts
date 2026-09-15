import { z } from "zod";

export const createTenantRequestSchema = z.object({
  name: z.string().trim().min(1).max(255),
}).strict();

export type CreateTenantRequest = z.infer<typeof createTenantRequestSchema>;
